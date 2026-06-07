"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RoomSeatMap } from "@/components/hospitality/room-seat-map";
import { clampLayoutObject, createLayoutObject, type RoomLayoutConfig, type RoomLayoutObjectType } from "@/lib/room-layout";
import { useLanguage } from "@/components/providers/language-provider";

const OBJECT_TYPES: Array<{ value: RoomLayoutObjectType; label: string }> = [
  { value: "chair", label: "Chair" },
  { value: "tableRect", label: "Meeting table" },
  { value: "tableRound", label: "Round table" },
  { value: "screen", label: "Screen" },
  { value: "doorDouble", label: "Double door" },
  { value: "shapeRect", label: "Rectangle" },
  { value: "shapeRounded", label: "Rounded shape" },
  { value: "shapeCircle", label: "Circle" },
  { value: "shapeLine", label: "Line" }
];

export function RoomLayoutEditor({
  layout,
  onChange
}: {
  layout: RoomLayoutConfig;
  onChange: (layout: RoomLayoutConfig) => void;
}) {
  const { t } = useLanguage();
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(layout.objects.at(-1)?.id ?? null);
  const selectedObject = layout.objects.find((object) => object.id === selectedObjectId) ?? null;

  useEffect(() => {
    if (selectedObjectId && layout.objects.some((object) => object.id === selectedObjectId)) {
      return;
    }

    setSelectedObjectId(layout.objects.at(-1)?.id ?? null);
  }, [layout.objects, selectedObjectId]);

  function setSelectedObject(id: string) {
    setSelectedObjectId(id);
  }

  function updateObject(id: string, patch: Partial<typeof selectedObject>) {
    onChange({
      ...layout,
      objects: layout.objects.map((object) => (object.id === id ? clampLayoutObject({ ...object, ...patch }) : object))
    });
  }

  function addObject(type: RoomLayoutObjectType) {
    const chairCount = layout.objects.filter((object) => object.type === "chair").length + 1;
    const object = createLayoutObject(type, chairCount);
    onChange({
      ...layout,
      objects: [...layout.objects, object]
    });
    setSelectedObjectId(object.id);
  }

  function deleteSelected() {
    if (!selectedObjectId) {
      return;
    }

    onChange({
      ...layout,
      objects: layout.objects.filter((object) => object.id !== selectedObjectId)
    });
    setSelectedObjectId(null);
  }

  function duplicateSelected() {
    if (!selectedObject) {
      return;
    }

    const duplicateId = createLayoutObject(selectedObject.type, layout.objects.filter((item) => item.type === "chair").length + 1).id;
    const copy = clampLayoutObject({
      ...selectedObject,
      id: duplicateId,
      label: selectedObject.type === "chair" ? `${selectedObject.label} copy` : selectedObject.label,
      x: selectedObject.x + 4,
      y: selectedObject.y + 4
    });

    onChange({
      ...layout,
      objects: [...layout.objects, copy]
    });
    setSelectedObjectId(copy.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {OBJECT_TYPES.map((objectType) => (
          <Button key={objectType.value} type="button" variant="secondary" onClick={() => addObject(objectType.value)}>
            <Plus className="mr-2 h-4 w-4" />
            {t(objectType.label)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <RoomSeatMap
          layout={layout}
          mode="edit"
          selectedObjectId={selectedObjectId}
          onSelectObject={setSelectedObject}
          onMoveObject={(id, x, y) => updateObject(id, { x, y })}
          onResizeObject={(id, width, height) => updateObject(id, { width, height })}
        />

        <div className="rounded-[28px] border border-[var(--line)] bg-slate-50 p-4">
          {selectedObject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">{t("Object settings")}</h4>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-[var(--line)]">
                  {t("Drag objects and resize them from the blue handle on the canvas.")}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={duplicateSelected}>
                    <Copy className="mr-2 h-4 w-4" />
                    {t("Duplicate")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={deleteSelected}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("Delete")}
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("Object type")}</label>
                <Select value={selectedObject.type} onChange={(event) => updateObject(selectedObject.id, { type: event.target.value as RoomLayoutObjectType })}>
                  {OBJECT_TYPES.map((objectType) => (
                    <option key={objectType.value} value={objectType.value}>
                      {t(objectType.label)}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t("Label")}</label>
                <Input value={selectedObject.label} onChange={(event) => updateObject(selectedObject.id, { label: event.target.value })} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField label={t("X position")} value={selectedObject.x} onChange={(value) => updateObject(selectedObject.id, { x: value })} />
                <NumberField label={t("Y position")} value={selectedObject.y} onChange={(value) => updateObject(selectedObject.id, { y: value })} />
                <NumberField label={t("Width")} value={selectedObject.width} onChange={(value) => updateObject(selectedObject.id, { width: value })} />
                <NumberField label={t("Height")} value={selectedObject.height} onChange={(value) => updateObject(selectedObject.id, { height: value })} />
                <NumberField label={t("Rotation")} value={selectedObject.rotation} onChange={(value) => updateObject(selectedObject.id, { rotation: value })} />
              </div>

              {selectedObject.type === "chair" ? (
                <label className="flex items-center gap-2 rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedObject.selectable}
                    onChange={(event) => updateObject(selectedObject.id, { selectable: event.target.checked })}
                  />
                  {t("Guests can select this chair")}
                </label>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[var(--line)] bg-white px-4 py-6 text-sm text-slate-500">
              {t("Select an object from the canvas to edit it, or add a new object from the toolbar.")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <Input type="number" step="1" value={String(Math.round(value))} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
