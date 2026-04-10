param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,

  [string[]]$Sheets = @(),

  [int]$SampleCommentCount = 10
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-SharedStrings {
  param([System.IO.Compression.ZipArchive]$Zip)

  $entry = $Zip.GetEntry("xl/sharedStrings.xml")
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    $xml = [xml]$reader.ReadToEnd()
  }
  finally {
    $reader.Close()
  }

  $values = @()
  foreach ($si in $xml.sst.si) {
    if ($si.t) {
      $values += $si.t.'#text'
    }
    elseif ($si.r) {
      $values += (($si.r | ForEach-Object { $_.t.'#text' }) -join "")
    }
    else {
      $values += ""
    }
  }

  return ,$values
}

function Get-WorkbookMaps {
  param([System.IO.Compression.ZipArchive]$Zip)

  $reader = [System.IO.StreamReader]::new(($Zip.GetEntry("xl/workbook.xml")).Open())
  try {
    $workbook = [xml]$reader.ReadToEnd()
  }
  finally {
    $reader.Close()
  }

  $reader = [System.IO.StreamReader]::new(($Zip.GetEntry("xl/_rels/workbook.xml.rels")).Open())
  try {
    $rels = [xml]$reader.ReadToEnd()
  }
  finally {
    $reader.Close()
  }

  $sheetRidByName = @{}
  foreach ($sheet in $workbook.workbook.sheets.sheet) {
    $sheetRidByName[[string]$sheet.name] = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
  }

  $targetByRid = @{}
  foreach ($rel in $rels.Relationships.Relationship) {
    $targetByRid[[string]$rel.Id] = [string]$rel.Target
  }

  return @{
    SheetRidByName = $sheetRidByName
    TargetByRid = $targetByRid
  }
}

function Resolve-SheetTarget {
  param(
    [hashtable]$Maps,
    [string]$SheetName
  )

  $rid = $Maps.SheetRidByName[$SheetName]
  if (-not $rid) {
    return $null
  }

  $target = $Maps.TargetByRid[$rid]
  if (-not $target) {
    return $null
  }

  if ($target -notlike "worksheets/*") {
    $target = "worksheets/" + [System.IO.Path]::GetFileName($target)
  }

  return "xl/$target"
}

function Read-XmlEntry {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$Path
  )

  $entry = $Zip.GetEntry($Path)
  if (-not $entry) {
    return $null
  }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    return [xml]$reader.ReadToEnd()
  }
  finally {
    $reader.Close()
  }
}

function Get-CommentText {
  param($Comment)

  if ($Comment.text.t) {
    return [string]$Comment.text.t
  }

  if ($Comment.text.r) {
    return (($Comment.text.r | ForEach-Object { $_.t.'#text' }) -join "")
  }

  return ""
}

function Get-ThreadedCommentSamples {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    $SheetRelsXml,
    [int]$SampleCount
  )

  $samples = @()
  $threadTarget = ($SheetRelsXml.Relationships.Relationship | Where-Object { $_.Type -like "*threadedComment" } | Select-Object -First 1).Target
  if (-not $threadTarget) {
    return ,$samples
  }

  $threadPath = "xl/" + ($threadTarget -replace '^\.\./', '')
  $threadXml = Read-XmlEntry -Zip $Zip -Path $threadPath
  if (-not $threadXml) {
    return ,$samples
  }

  $samples = @(
    $threadXml.ThreadedComments.threadedComment |
      Select-Object -First $SampleCount |
      ForEach-Object {
        [pscustomobject]@{
          ref = [string]$_.ref
          text = ([string]$_.text) -replace "\r?\n", " "
        }
      }
  )

  return ,$samples
}

function Get-CellValue {
  param(
    $Cell,
    [string[]]$SharedStrings
  )

  if ($Cell.t -eq "s") {
    return $SharedStrings[[int]$Cell.v]
  }

  if ($Cell.is -and $Cell.is.t) {
    return [string]$Cell.is.t
  }

  if ($Cell.v) {
    return [string]$Cell.v
  }

  return ""
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $sharedStrings = Get-SharedStrings -Zip $zip
  $maps = Get-WorkbookMaps -Zip $zip

  if (-not $Sheets -or $Sheets.Count -eq 0) {
    $Sheets = $maps.SheetRidByName.Keys | Sort-Object
  }

  $results = @()

  foreach ($sheetName in $Sheets) {
    $sheetPath = Resolve-SheetTarget -Maps $maps -SheetName $sheetName
    if (-not $sheetPath) {
      $results += [pscustomobject]@{
        sheet = $sheetName
        found = $false
      }
      continue
    }

    $sheetXml = Read-XmlEntry -Zip $zip -Path $sheetPath
    $dimension = [string]$sheetXml.worksheet.dimension.ref
    $rows = @($sheetXml.worksheet.sheetData.row)
    $nonEmpty = @()

    foreach ($row in $rows) {
      foreach ($cell in $row.c) {
        $ref = [string]$cell.r
        $col = $ref -replace "\d", ""
        if ($col -lt "D") {
          continue
        }

        $value = Get-CellValue -Cell $cell -SharedStrings $sharedStrings
        if ($value -and ($value -notmatch '^\d+(\.\d+)?$')) {
          $nonEmpty += [pscustomobject]@{
            ref = $ref
            value = $value
          }
        }
      }
    }

    $sheetRelsPath = "xl/worksheets/_rels/{0}.rels" -f ([System.IO.Path]::GetFileName($sheetPath))
    $sheetRelsXml = Read-XmlEntry -Zip $zip -Path $sheetRelsPath
    $commentCount = 0
    $commentSamples = @()
    $threadedCommentSamples = @()
    if ($sheetRelsXml) {
      $commentTarget = ($sheetRelsXml.Relationships.Relationship | Where-Object { $_.Type -like "*comments" } | Select-Object -First 1).Target
      if ($commentTarget) {
        $commentPath = "xl/" + ($commentTarget -replace '^\.\./', '')
        $commentXml = Read-XmlEntry -Zip $zip -Path $commentPath
        if ($commentXml) {
          $comments = @($commentXml.comments.commentList.comment)
          $commentCount = $comments.Count
          $commentSamples = @(
            $comments |
              Select-Object -First $SampleCommentCount |
              ForEach-Object {
                [pscustomobject]@{
                  ref = [string]$_.ref
                  text = (Get-CommentText -Comment $_) -replace "\r?\n", " "
                }
              }
          )
        }
      }

      $threadedCommentSamples = Get-ThreadedCommentSamples -Zip $zip -SheetRelsXml $sheetRelsXml -SampleCount $SampleCommentCount
    }

    $results += [pscustomobject]@{
      sheet = $sheetName
      found = $true
      dimension = $dimension
      nonEmptyCount = $nonEmpty.Count
      sampleNonEmpty = @($nonEmpty | Select-Object -First 20)
      commentCount = $commentCount
      sampleComments = $commentSamples
      sampleThreadedComments = $threadedCommentSamples
    }
  }

  $results | ConvertTo-Json -Depth 6
}
finally {
  $zip.Dispose()
}
