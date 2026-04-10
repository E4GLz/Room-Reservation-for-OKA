param(
  [Parameter(Mandatory = $true)]
  [string]$WorkbookPath,

  [Parameter(Mandatory = $true)]
  [string[]]$Sheets,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
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

function Get-CellValue {
  param($Cell, [string[]]$SharedStrings)

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

function Get-SheetMonthParts {
  param([string]$SheetName)

  $monthMap = @{
    Jan = 1; January = 1
    Feb = 2; February = 2
    Mar = 3; March = 3
    Apr = 4; April = 4
    May = 5
    Jun = 6; June = 6
    Jul = 7; July = 7
    Aug = 8; August = 8
    Sep = 9; September = 9
    Oct = 10; October = 10
    Nov = 11; November = 11
    Dec = 12; December = 12
  }

  $clean = ($SheetName -replace '\s*\(.*\)\s*$', '').Trim()
  $parts = $clean -split '\s+'
  if ($parts.Count -lt 2) {
    throw "Unable to parse month/year from sheet name: $SheetName"
  }

  $month = $monthMap[$parts[0]]
  $year = [int]$parts[1]
  return @{ Month = $month; Year = $year }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $sharedStrings = Get-SharedStrings -Zip $zip
  $workbook = Read-XmlEntry -Zip $zip -Path "xl/workbook.xml"
  $rels = Read-XmlEntry -Zip $zip -Path "xl/_rels/workbook.xml.rels"

  $sheetRidByName = @{}
  foreach ($sheet in $workbook.workbook.sheets.sheet) {
    $sheetRidByName[[string]$sheet.name] = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
  }

  $targetByRid = @{}
  foreach ($rel in $rels.Relationships.Relationship) {
    $targetByRid[[string]$rel.Id] = [string]$rel.Target
  }

  $records = @()

  foreach ($sheetName in $Sheets) {
    $rid = $sheetRidByName[$sheetName]
    if (-not $rid) {
      continue
    }

    $target = $targetByRid[$rid]
    if ($target -notlike "worksheets/*") {
      $target = "worksheets/" + [System.IO.Path]::GetFileName($target)
    }

    $sheetPath = "xl/$target"
    $sheetXml = Read-XmlEntry -Zip $zip -Path $sheetPath
    $monthParts = Get-SheetMonthParts -SheetName $sheetName
    $rowDays = @{}
    $visibleByRef = @{}

    foreach ($row in $sheetXml.worksheet.sheetData.row) {
      $rowNumber = [int]$row.r
      $dayCell = $row.c | Where-Object { $_.r -eq ("C" + $row.r) } | Select-Object -First 1
      if ($dayCell) {
        $dayValue = Get-CellValue -Cell $dayCell -SharedStrings $sharedStrings
        if ($dayValue -match '^\d+$') {
          $rowDays[$rowNumber] = [int]$dayValue
        }
      }

      foreach ($cell in $row.c) {
        $ref = [string]$cell.r
        $column = $ref -replace "\d", ""
        if ($column -lt "D") {
          continue
        }

        $value = (Get-CellValue -Cell $cell -SharedStrings $sharedStrings).Trim()
        if (-not $value -or $value -match '^\d+(\.\d+)?$') {
          continue
        }

        $visibleByRef[$ref] = [pscustomobject]@{
          sheetName = $sheetName
          ref = $ref
          column = $column
          row = $rowNumber
          dateKey = if ($rowDays.ContainsKey($rowNumber)) {
            "{0}-{1:D2}-{2:D2}" -f $monthParts.Year, $monthParts.Month, $rowDays[$rowNumber]
          } else {
            $null
          }
          text = $value
          sourceType = "visible"
        }
      }
    }

    foreach ($entry in $visibleByRef.Values) {
      $records += $entry
    }

    $sheetRelsPath = "xl/worksheets/_rels/{0}.rels" -f ([System.IO.Path]::GetFileName($sheetPath))
    $sheetRelsXml = Read-XmlEntry -Zip $zip -Path $sheetRelsPath
    if (-not $sheetRelsXml) {
      continue
    }

    $commentTarget = ($sheetRelsXml.Relationships.Relationship | Where-Object { $_.Type -like "*comments" } | Select-Object -First 1).Target
    if ($commentTarget) {
      $commentPath = "xl/" + ($commentTarget -replace '^\.\./', '')
      $commentXml = Read-XmlEntry -Zip $zip -Path $commentPath
      if ($commentXml) {
        foreach ($comment in $commentXml.comments.commentList.comment) {
          $ref = [string]$comment.ref
          if ($visibleByRef.ContainsKey($ref)) {
            continue
          }

          $column = $ref -replace "\d", ""
          $rowNumber = [int]($ref -replace "\D", "")
          $day = if ($rowDays.ContainsKey($rowNumber)) { $rowDays[$rowNumber] } else { $null }
          $textValue = ""
          if ($comment.text) {
            if ($comment.text.t) {
              $textValue = [string]$comment.text.t
            }
            elseif ($comment.text.r) {
              $textValue = (($comment.text.r | ForEach-Object { $_.t.'#text' }) -join "")
            }
          }

          $records += [pscustomobject]@{
            sheetName = $sheetName
            ref = $ref
            column = $column
            row = $rowNumber
            dateKey = if ($day) { "{0}-{1:D2}-{2:D2}" -f $monthParts.Year, $monthParts.Month, $day } else { $null }
            text = $textValue.Trim()
            sourceType = "comment"
          }
        }
      }
    }

    $threadTarget = ($sheetRelsXml.Relationships.Relationship | Where-Object { $_.Type -like "*threadedComment" } | Select-Object -First 1).Target
    if (-not $threadTarget) {
      continue
    }

    $threadPath = "xl/" + ($threadTarget -replace '^\.\./', '')
    $threadXml = Read-XmlEntry -Zip $zip -Path $threadPath
    if (-not $threadXml) {
      continue
    }

    foreach ($comment in $threadXml.ThreadedComments.threadedComment) {
      $ref = [string]$comment.ref
      $column = $ref -replace "\d", ""
      $rowNumber = [int]($ref -replace "\D", "")
      $day = if ($rowDays.ContainsKey($rowNumber)) { $rowDays[$rowNumber] } else { $null }
      $text = [string]$comment.text

      $records += [pscustomobject]@{
        sheetName = $sheetName
        ref = $ref
        column = $column
        row = $rowNumber
        dateKey = if ($day) { "{0}-{1:D2}-{2:D2}" -f $monthParts.Year, $monthParts.Month, $day } else { $null }
        text = $text.Trim()
        sourceType = "comment"
      }
    }
  }

  [pscustomobject]@{
    sheets = $Sheets
    records = $records
  } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding utf8

  Write-Output $OutputPath
  Write-Output ("RECORDS=" + $records.Count)
}
finally {
  $zip.Dispose()
}
