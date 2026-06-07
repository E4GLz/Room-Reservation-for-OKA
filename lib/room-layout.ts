export type RoomLayoutObjectType =
  | "chair"
  | "tableRect"
  | "tableRound"
  | "screen"
  | "doorDouble"
  | "shapeRect"
  | "shapeRounded"
  | "shapeCircle"
  | "shapeLine";

export type RoomLayoutObject = {
  id: string;
  type: RoomLayoutObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  selectable: boolean;
};

export type RoomLayoutConfig = {
  version: 2;
  canvas: {
    width: number;
    height: number;
  };
  objects: RoomLayoutObject[];
};

export type RoomSeatOption = {
  key: string;
  label: string;
  selectable: boolean;
};

const DEFAULT_CANVAS = { width: 100, height: 100 };

export function createEmptyRoomLayout(): RoomLayoutConfig {
  return {
    version: 2,
    canvas: DEFAULT_CANVAS,
    objects: []
  };
}

export function createLayoutObject(type: RoomLayoutObjectType, labelIndex = 1): RoomLayoutObject {
  const baseId = `${type}-${globalThis.crypto.randomUUID()}`;

  if (type === "chair") {
    return {
      id: baseId,
      type,
      x: 44,
      y: 44,
      width: 8,
      height: 10,
      rotation: 0,
      label: `A${labelIndex}`,
      selectable: true
    };
  }

  if (type === "tableRect") {
    return {
      id: baseId,
      type,
      x: 34,
      y: 38,
      width: 32,
      height: 18,
      rotation: 0,
      label: "Table",
      selectable: false
    };
  }

  if (type === "tableRound") {
    return {
      id: baseId,
      type,
      x: 38,
      y: 36,
      width: 24,
      height: 24,
      rotation: 0,
      label: "Round table",
      selectable: false
    };
  }

  if (type === "screen") {
    return {
      id: baseId,
      type,
      x: 39,
      y: 6,
      width: 22,
      height: 10,
      rotation: 0,
      label: "Screen",
      selectable: false
    };
  }

  if (type === "shapeRect") {
    return {
      id: baseId,
      type,
      x: 34,
      y: 38,
      width: 22,
      height: 14,
      rotation: 0,
      label: "Rectangle",
      selectable: false
    };
  }

  if (type === "shapeRounded") {
    return {
      id: baseId,
      type,
      x: 36,
      y: 38,
      width: 22,
      height: 14,
      rotation: 0,
      label: "Rounded shape",
      selectable: false
    };
  }

  if (type === "shapeCircle") {
    return {
      id: baseId,
      type,
      x: 40,
      y: 40,
      width: 18,
      height: 18,
      rotation: 0,
      label: "Circle",
      selectable: false
    };
  }

  if (type === "shapeLine") {
    return {
      id: baseId,
      type,
      x: 30,
      y: 50,
      width: 24,
      height: 3,
      rotation: 0,
      label: "Line",
      selectable: false
    };
  }

  return {
    id: baseId,
    type,
    x: 82,
    y: 82,
    width: 12,
    height: 8,
    rotation: 0,
    label: "Double door",
    selectable: false
  };
}

export function parseRoomLayout(raw: string | null | undefined, capacity: number): RoomLayoutConfig {
  if (!raw?.trim()) {
    return createLegacyAutoLayout(capacity);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RoomLayoutConfig> & {
      rows?: Array<{ id?: string; label?: string; seats?: number }>;
      screenSide?: string;
      doorSide?: string;
    };

    if (parsed?.version === 2 && Array.isArray(parsed.objects)) {
      return {
        version: 2,
        canvas: DEFAULT_CANVAS,
        objects: parsed.objects
          .map(sanitizeObject)
          .filter((value): value is RoomLayoutObject => Boolean(value))
      };
    }

    if (Array.isArray(parsed?.rows)) {
      return createLegacyAutoLayout(capacity, parsed.rows);
    }

    return createLegacyAutoLayout(capacity);
  } catch {
    return createLegacyAutoLayout(capacity);
  }
}

export function serializeRoomLayout(config: RoomLayoutConfig) {
  return JSON.stringify(config);
}

export function listSeatOptions(config: RoomLayoutConfig) {
  return config.objects
    .filter((object) => object.type === "chair")
    .map((object) => ({
      key: object.id,
      label: object.label,
      selectable: object.selectable
    }));
}

export function clampLayoutObject(object: RoomLayoutObject) {
  const maxWidth = object.type === "shapeLine" ? 100 : 90;
  const maxHeight = object.type === "shapeLine" ? 12 : 90;

  return {
    ...object,
    x: clamp(object.x, 0, 100 - object.width),
    y: clamp(object.y, 0, 100 - object.height),
    width: clamp(object.width, 4, maxWidth),
    height: clamp(object.height, 4, maxHeight),
    rotation: clamp(object.rotation, -180, 180)
  };
}

function sanitizeObject(value: Partial<RoomLayoutObject> | null | undefined): RoomLayoutObject | null {
  if (!value?.type || !isObjectType(value.type)) {
    return null;
  }

  return clampLayoutObject({
    id: String(value.id ?? `${value.type}-${globalThis.crypto.randomUUID()}`),
    type: value.type,
    x: Number(value.x ?? 40),
    y: Number(value.y ?? 40),
    width: Number(value.width ?? 10),
    height: Number(value.height ?? 10),
    rotation: Number(value.rotation ?? 0),
    label: String(value.label ?? defaultLabelForType(value.type)),
    selectable: value.type === "chair" ? Boolean(value.selectable ?? true) : false
  });
}

function createLegacyAutoLayout(
  capacity: number,
  rows?: Array<{ id?: string; label?: string; seats?: number }>
): RoomLayoutConfig {
  const safeCapacity = Math.max(1, capacity);
  const legacyRows =
    rows && rows.length > 0
      ? rows
      : buildDefaultRows(safeCapacity);

  const objects: RoomLayoutObject[] = [
    {
      id: "screen-default",
      type: "screen",
      x: 39,
      y: 4,
      width: 22,
      height: 10,
      rotation: 0,
      label: "Screen",
      selectable: false
    },
    {
      id: "door-default",
      type: "doorDouble",
      x: 83,
      y: 88,
      width: 12,
      height: 8,
      rotation: 0,
      label: "Double door",
      selectable: false
    }
  ];

  legacyRows.forEach((row, rowIndex) => {
    const rowLabel = String(row.label ?? String.fromCharCode(65 + rowIndex));
    const seatCount = Math.max(1, Math.round(Number(row.seats ?? 4)));
    const split = Math.ceil(seatCount / 2);
    const topCount = split;
    const bottomCount = seatCount - split;
    const tableY = 18 + rowIndex * 25;

    objects.push({
      id: `table-${rowLabel.toLowerCase()}`,
      type: "tableRect",
      x: 26,
      y: tableY,
      width: 48,
      height: 12,
      rotation: 0,
      label: `Table ${rowLabel}`,
      selectable: false
    });

    placeChairs(rowLabel, topCount, 28, tableY - 10, 46, objects);
    if (bottomCount > 0) {
      placeChairs(rowLabel, bottomCount, 28, tableY + 14, 46, objects, topCount);
    }
  });

  return {
    version: 2,
    canvas: DEFAULT_CANVAS,
    objects: objects.map(clampLayoutObject)
  };
}

function placeChairs(
  rowLabel: string,
  count: number,
  startX: number,
  y: number,
  span: number,
  objects: RoomLayoutObject[],
  startIndex = 0
) {
  if (count <= 0) {
    return;
  }

  const gap = count === 1 ? 0 : span / (count - 1);
  for (let index = 0; index < count; index += 1) {
    objects.push({
      id: `chair-${rowLabel.toLowerCase()}-${startIndex + index + 1}`,
      type: "chair",
      x: startX + gap * index,
      y,
      width: 8,
      height: 10,
      rotation: 0,
      label: `${rowLabel}${startIndex + index + 1}`,
      selectable: true
    });
  }
}

function buildDefaultRows(capacity: number) {
  const rows: Array<{ label: string; seats: number }> = [];
  let remaining = capacity;
  let index = 0;

  while (remaining > 0) {
    const rowSeats = Math.min(6, remaining);
    rows.push({
      label: String.fromCharCode(65 + index),
      seats: rowSeats
    });
    remaining -= rowSeats;
    index += 1;
  }

  return rows;
}

function defaultLabelForType(type: RoomLayoutObjectType) {
  if (type === "chair") {
    return "Chair";
  }

  if (type === "tableRect") {
    return "Table";
  }

  if (type === "tableRound") {
    return "Round table";
  }

  if (type === "screen") {
    return "Screen";
  }

  if (type === "shapeRect") {
    return "Rectangle";
  }

  if (type === "shapeRounded") {
    return "Rounded shape";
  }

  if (type === "shapeCircle") {
    return "Circle";
  }

  if (type === "shapeLine") {
    return "Line";
  }

  return "Double door";
}

function isObjectType(value: unknown): value is RoomLayoutObjectType {
  return (
    value === "chair" ||
    value === "tableRect" ||
    value === "tableRound" ||
    value === "screen" ||
    value === "doorDouble" ||
    value === "shapeRect" ||
    value === "shapeRounded" ||
    value === "shapeCircle" ||
    value === "shapeLine"
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
