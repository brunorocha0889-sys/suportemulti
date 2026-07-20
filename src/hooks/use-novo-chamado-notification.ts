import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChamadoRow } from "@/components/helpdesk/chamado-shared";

let audioCtx: AudioContext | null = null;
let unlocked = false;

function ensureUnlock() {
  if (typeof window === "undefined" || unlocked) return;
  const unlock = () => {
    try {
      if (!audioCtx) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctor) audioCtx = new Ctor();
      }
      audioCtx?.resume().catch(() => {});
      unlocked = true;
    } catch {
      // ignore
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function playDing() {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audioCtx = new Ctor();
    }
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    beep(880, 0, 0.18);
    beep(1320, 0.14, 0.22);
  } catch {
    // ignore
  }
}

export function useNovoChamadoNotification(setor: string | undefined) {
  const qc = useQueryClient();
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    ensureUnlock();
  }, []);

  useEffect(() => {
    if (!setor) return;
    mountedAt.current = Date.now();

    const ch = supabase
      .channel(`novos-chamados-${setor}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chamados", filter: `setor_destino=eq.${setor}` },
        (payload) => {
          const c = payload.new as ChamadoRow;
          // Ignora inserts que possam chegar como replay antes do mount efetivo
          const createdAt = c.created_at ? new Date(c.created_at).getTime() : Date.now();
          if (createdAt < mountedAt.current - 5000) return;

          playDing();
          qc.invalidateQueries({ queryKey: ["chamados", setor] });

          toast.success("Novo chamado recebido", {
            description: `${c.numero_os ?? "OS"} • ${c.solicitante_nome} — ${c.solicitante_setor}`,
            duration: 8000,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [setor, qc]);
}
