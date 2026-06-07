"use client";

import { Armchair, DoorOpen, MonitorPlay } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import type { RoomLayoutConfig, RoomLayoutObject } from "@/lib/room-layout";

export function RoomSeatMap({
  layout,
  selectedSeatKey,
  highlightedSeatKeys,
  seatAnnotations,
  onSelect,
  selectedObjectId,
  onSelectObject,
  onMoveObject,
  onResizeObject,
  disabled = false,
  className,
  mode = "guest"
}: {
  layout: RoomLayoutConfig;
  selectedSeatKey?: string | null;
  highlightedSeatKeys?: string[];
  seatAnnotations?: Record<string, string>;
  onSelect?: (seatKey: string, seatLabel: string) => void;
  selectedObjectId?: string | null;
  onSelectObject?: (objectId: string) => void;
  onMoveObject?: (objectId: string, x: number, y: number) => void;
  onResizeObject?: (objectId: string, width: number, height: number) => void;
  disabled?: boolean;
  className?: string;
  mode?: "guest" | "preview" | "edit";
}) {
  const { t } = useLanguage();

  function getBoardMetrics(target: HTMLElement, object: RoomLayoutObject) {
    const board = target.parentElement?.parentElement?.parentElement;
    if (!board) {
      return null;
    }

    const rect = board.getBoundingClientRect();
    return { board, rect, object };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, object: RoomLayoutObject) {
    if (mode !== "edit" || disabled || !onMoveObject) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const metrics = getBoardMetrics(event.currentTarget, object);
    if (!metrics) {
      return;
    }

    const { rect } = metrics;
    const offsetX = (event.clientX - rect.left) / rect.width * 100 - object.x;
    const offsetY = (event.clientY - rect.top) / rect.height * 100 - object.y;

    const move = (moveEvent: PointerEvent) => {
      const nextX = ((moveEvent.clientX - rect.left) / rect.width) * 100 - offsetX;
      const nextY = ((moveEvent.clientY - rect.top) / rect.height) * 100 - offsetY;
      onMoveObject(object.id, nextX, nextY);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLSpanElement>, object: RoomLayoutObject) {
    if (mode !== "edit" || disabled || !onResizeObject) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const metrics = getBoardMetrics(event.currentTarget, object);
    if (!metrics) {
      return;
    }

    const { rect } = metrics;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = object.width;
    const startHeight = object.height;

    const move = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      onResizeObject(object.id, startWidth + deltaX, startHeight + deltaY);
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className={cn("rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,#f7fbff,#ebf2fa)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]", className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] border border-[#d8e3f2] bg-[linear-gradient(180deg,#fcfdff,#eff5fb)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)", backgroundSize: "5% 5%" }} />

        {layout.objects.map((object) => (
          <button
            key={object.id}
            type="button"
            disabled={disabled || (mode === "guest" && object.type !== "chair")}
            onClick={() => {
              if (mode === "guest") {
                if (object.type === "chair" && object.selectable) {
                  onSelect?.(object.id, object.label);
                }
                return;
              }

              onSelectObject?.(object.id);
            }}
            onPointerDown={(event) => handlePointerDown(event, object)}
            className={cn(
              "absolute transition",
              mode === "edit" ? "cursor-move" : object.type === "chair" && object.selectable ? "cursor-pointer" : "cursor-default",
              object.type === "chair" && !object.selectable && mode === "guest" ? "opacity-45" : ""
            )}
            style={{
              left: `${object.x}%`,
              top: `${object.y}%`,
              width: `${object.width}%`,
              height: `${object.height}%`,
              transform: `rotate(${object.rotation}deg)`
            }}
            aria-pressed={object.id === selectedSeatKey || object.id === selectedObjectId}
          >
            <LayoutObjectView
              object={object}
              selected={
                object.id === selectedSeatKey ||
                object.id === selectedObjectId ||
                Boolean(highlightedSeatKeys?.includes(object.id))
              }
              annotation={seatAnnotations?.[object.id]}
              mode={mode}
              t={t}
            />
            {mode === "edit" ? (
              <span
                role="presentation"
                onPointerDown={(event) => handleResizePointerDown(event, object)}
                className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full border border-white bg-[var(--accent)] shadow-[0_8px_18px_-10px_rgba(37,87,229,0.8)]"
              >
                <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function LayoutObjectView({
  object,
  selected,
  annotation,
  mode,
  t
}: {
  object: RoomLayoutObject;
  selected: boolean;
  annotation?: string;
  mode: "guest" | "preview" | "edit";
  t: (text: string) => string;
}) {
  const selectedRing = selected ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-white/80" : "";
  const objectLabel = object.label?.trim();

  if (object.type === "chair") {
    return (
      <div className="relative h-full w-full">
        <div
          className={cn(
            "absolute inset-[8%] rounded-[18px] border shadow-[0_10px_20px_-18px_rgba(15,23,42,0.45)]",
            selected
              ? "border-[#2450d6] bg-[#2f63ea]"
              : "border-[#cdd7e5] bg-white"
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 top-[16%] h-[18%] w-[58%] -translate-x-1/2 rounded-t-[12px] border border-b-0",
            selected ? "border-white/35 bg-white/18" : "border-[#d8e1ef] bg-[#eef3f9]"
          )}
        />
        <div
          className={cn(
            "absolute left-1/2 top-[36%] h-[32%] w-[72%] -translate-x-1/2 rounded-[12px] border",
            selected ? "border-white/20 bg-white/12" : "border-[#d8e1ef] bg-[#f8fafc]"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[14%] left-[20%] h-[12%] w-[12%] rounded-full",
            selected ? "bg-white/35" : "bg-[#d7e0ec]"
          )}
        />
        <div
          className={cn(
            "absolute bottom-[14%] right-[20%] h-[12%] w-[12%] rounded-full",
            selected ? "bg-white/35" : "bg-[#d7e0ec]"
          )}
        />
        {mode !== "guest" ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Armchair className={cn("h-[34%] w-[34%]", selected ? "text-white/92" : "text-slate-500")} strokeWidth={1.8} />
          </div>
        ) : null}
        {mode === "edit" ? (
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm">
            {object.label}
          </span>
        ) : null}
        {mode === "preview" && annotation ? (
          <span className="absolute -top-7 left-1/2 max-w-[140px] -translate-x-1/2 truncate rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)]">
            {annotation}
          </span>
        ) : null}
        <div className={cn("absolute inset-[6%] rounded-[16px]", selectedRing)} />
        {!object.selectable ? (
          <span className="absolute right-0 top-0 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
            {t("Locked")}
          </span>
        ) : null}
        <span className="sr-only">{object.label}</span>
      </div>
    );
  }

  if (object.type === "tableRect") {
    return (
      <div className={cn("relative h-full w-full rounded-[22px] border border-[#d5deeb] bg-[#f8fafc] shadow-[0_14px_28px_-26px_rgba(15,23,42,0.55)]", selectedRing)}>
        <div className="absolute inset-[8%] rounded-[18px] border border-dashed border-[#dbe3ef]" />
        <div className="absolute left-[8%] top-1/2 h-[1px] w-[84%] -translate-y-1/2 bg-[#e1e8f2]" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{objectLabel || t("Meeting table")}</span>
        </div>
      </div>
    );
  }

  if (object.type === "tableRound") {
    return (
      <div className={cn("relative h-full w-full rounded-full border border-[#d5deeb] bg-[#f8fafc] shadow-[0_14px_28px_-26px_rgba(15,23,42,0.55)]", selectedRing)}>
        <div className="absolute inset-[10%] rounded-full border border-dashed border-[#dbe3ef]" />
        <div className="absolute left-1/2 top-1/2 h-[1px] w-[62%] -translate-x-1/2 -translate-y-1/2 bg-[#e1e8f2]" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{objectLabel || t("Meeting table")}</span>
        </div>
      </div>
    );
  }

  if (object.type === "screen") {
    return (
      <div className={cn("relative h-full w-full", selectedRing)}>
        <div className="absolute inset-x-[8%] top-[4%] h-[60%] rounded-[14px] border border-[#b9c7dc] bg-[#eef3f8] shadow-[0_14px_22px_-24px_rgba(15,23,42,0.5)]">
          <div className="absolute inset-[8%] rounded-[10px] border border-[#d7e0eb] bg-white" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-[#516884]">
            <MonitorPlay className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{objectLabel || t("Screen")}</span>
          </div>
        </div>
        <div className="absolute bottom-[14%] left-1/2 h-[10%] w-[10%] -translate-x-1/2 rounded-full bg-[#c6d2e4]" />
        <div className="absolute bottom-[8%] left-1/2 h-[6%] w-[36%] -translate-x-1/2 rounded-full bg-[#c6d2e4]" />
      </div>
    );
  }

  if (object.type === "shapeRect") {
    return (
      <div className={cn("h-full w-full rounded-[10px] border-2 border-slate-300 bg-slate-100", selectedRing)}>
        <span className="sr-only">{objectLabel || t("Rectangle")}</span>
      </div>
    );
  }

  if (object.type === "shapeRounded") {
    return (
      <div className={cn("h-full w-full rounded-[24px] border-2 border-slate-300 bg-slate-100", selectedRing)}>
        <span className="sr-only">{objectLabel || t("Rounded shape")}</span>
      </div>
    );
  }

  if (object.type === "shapeCircle") {
    return (
      <div className={cn("h-full w-full rounded-full border-2 border-slate-300 bg-slate-100", selectedRing)}>
        <span className="sr-only">{objectLabel || t("Circle")}</span>
      </div>
    );
  }

  if (object.type === "shapeLine") {
    return (
      <div className={cn("h-full w-full rounded-full bg-slate-300", selectedRing)}>
        <span className="sr-only">{objectLabel || t("Line")}</span>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", selectedRing)}>
      <div className="absolute inset-y-[10%] left-0 w-[42%] rounded-l-[14px] border border-[#c7d4e6] bg-white" />
      <div className="absolute inset-y-[10%] right-0 w-[42%] rounded-r-[14px] border border-[#c7d4e6] bg-white" />
      <div className="absolute inset-y-[16%] left-1/2 w-[4%] -translate-x-1/2 rounded-full bg-[#dde6f2]" />
      <div className="absolute inset-0 flex items-center justify-center gap-2 text-[#64748b]">
        <DoorOpen className="h-4 w-4" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">{objectLabel || t("Double door")}</span>
      </div>
    </div>
  );
}
