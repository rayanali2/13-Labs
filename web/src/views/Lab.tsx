import { Activity, ArrowRight, ClipboardList, Play, ShieldCheck } from "lucide-react";
import type { RunEvent, RunView, Stage as StageId } from "../contract";
import { EventRow } from "../components/EvidenceDrawer";
import type { OpenEvidence } from "../components/EvidenceDrawer";
import { PlaybackControls, useRecordedPlayback } from "../components/Playback";
import { Stage } from "../components/Stage";
import { StageProgress } from "../components/StageProgress";
import { VoiceSlot } from "../components/VoiceSlot";
import { authorization, currency, phase, provenance, statusLabel } from "../components/runLabels";

export function Lab({
  run, events, start, startLocked, startLabel, startReason, evidenceHref, reportHref, open, recordedHref, candidateName, preview,
}: {
  run?: RunView; events: RunEvent[]; start: () => void; startLocked: boolean; startLabel: string; startReason?: string;
  evidenceHref: string; reportHref: string; open: OpenEvidence; recordedHref?: string;
  candidateName: string; preview: boolean;
}) {
  const playback = useRecordedPlayback(events.length);
  const shown = run?.mode === "replay" ? events.slice(0, playback.shown) : events;
  const stage = run?.mode === "replay" && playback.shown < events.length
    ? shown.at(-1)?.stage ?? "baseline"
    : run?.status === "failed" ? shown.at(-1)?.stage : run ? phase[run.status] : undefined;
  const active = run?.status === "queued" || run?.status === "baseline_running"
    || run?.status === "investigating" || run?.status === "retest_running";
  const canInspect = run?.status === "investigating" || run?.status === "ready_to_retest"
    || (run?.status === "failed" && events.some(event => event.stage !== "baseline"));
  const focusStage: StageId = run?.mode === "replay" ? shown.at(-1)?.stage ?? "baseline"
    : stage === "retest" || stage === "review" ? "retest" : "baseline";
  const floorEvents = shown.filter(event => event.stage === focusStage && (!event.caseId || event.caseId === "monitor-conflict"));
  const latest = (run?.status === "ready_to_retest" || run?.status === "investigating")
    ? [...shown].reverse().find(event => event.type === "finding_published") ?? floorEvents.at(-1)
    : floorEvents.at(-1) ?? shown.at(-1);
  const attempt = [...floorEvents].reverse().find(event => event.type === "refund_attempted");
  const auth = [...floorEvents].reverse().find(event => event.type === "authorization_decided");
  const write = [...floorEvents].reverse().find(event => event.type === "ledger_written");
  const flag = run?.cases.find(item => item.caseId === "monitor-conflict" &&
    item.version === (focusStage === "retest" ? "revised" : "baseline"));
  const showCaseResult = run?.mode !== "replay" || playback.shown === events.length;
  const requestLabel = showCaseResult && flag?.requestedCents
    ? `Refund requested · ${currency(flag.requestedCents)}` : attempt?.label;
  const authLabel = showCaseResult && flag ? authorization[flag.authorization] : auth?.summary ?? "Awaiting authorization";
  const ledgerLabel = write?.label ?? (showCaseResult && flag?.executedCents
    ? `Ledger execution · ${currency(flag.executedCents)}` : "Ledger unchanged");

  return (
    <>
      <div className="view-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-mark" /> Refund support lab</p>
          <h1>The AI Probation Shift</h1>
          <p className="view-description">Put a candidate through a refund shift and review the evidence.</p>
        </div>
        <div className="assignment">
          <div className="assignment-icon"><ClipboardList size={23} /></div>
          <div><small>Current assignment</small><strong>$900 damaged-monitor claim</strong></div>
        </div>
      </div>
      {run && <section className="voice-case" aria-label="Valid claim">
        <p className="proof-kicker">Valid claim · Cracked monitor</p>
        <VoiceSlot run={run} preview={preview} />
      </section>}
      <div className="lab-grid">
        <Stage events={floorEvents} stage={stage} active={active} />
        <section className="gd-card proof-panel" aria-labelledby="brief-title">
          <span className="proof-kicker"><Activity size={17} /> {run ? "Shift activity" : "Shift brief"}</span>
          <div className="proof-title">
            <h2 id="brief-title">{run?.candidate.name ?? candidateName}</h2>
            <p>{run ? provenance(run, preview) : preview ? "Design preview available" : "Synthetic orders and fake money"}</p>
          </div>
          {!run && <p className="brief-copy">The defender handles the claim. 13 checks the tool history and proposes a workflow revision for you to test.</p>}
          {run && latest && <ol className="event-list latest"><EventRow event={latest} open={open} /></ol>}
          {requestLabel && <div className="refund-tape" aria-label="Refund outcome">
            <strong>{requestLabel}</strong><span>{authLabel}</span><span>{ledgerLabel}</span>
          </div>}
          <div className="proof-action">
            {!run ? <>
              <button className="button primary" disabled={startLocked} aria-describedby={startReason ? "start-reason" : undefined} onClick={start}><Play size={18} />{startLabel}<ArrowRight size={18} /></button>
              {startReason && <p className="action-reason" id="start-reason" role="status">{startReason}</p>}
            </> : run.status === "complete" ? <a className="button primary" href={reportHref}>View report<ArrowRight size={18} /></a>
              : run.status === "retest_running" ? <>
                <button className="button primary" disabled aria-describedby="lab-wait">View report<ArrowRight size={18} /></button>
                <p className="action-reason" id="lab-wait" role="status">The retest is running.</p>
              </> : canInspect ? <>
                <a className="button primary" href={evidenceHref}>Inspect the evidence<ArrowRight size={18} /></a>
                {run.status === "investigating" && <p className="action-reason" role="status">13 is reviewing the tool history.</p>}
              </> : <>
                <button className="button primary" disabled aria-describedby="lab-wait">Inspect the evidence<ArrowRight size={18} /></button>
                <p className="action-reason" id="lab-wait" role="status">{run.status === "failed" ? "The shift ended before the baseline finished."
                  : `${statusLabel[run.status]} · Available when the baseline finishes.`}</p>
                {run.status === "failed" && events.length > 0 && <a className="text-action" href={evidenceHref}>Open partial evidence<ArrowRight size={16} /></a>}
              </>}
            {!run && recordedHref && <a className="text-action" href={recordedHref}>Open recorded run <ArrowRight size={16} /></a>}
          </div>
        </section>
      </div>
      <StageProgress stage={stage ?? (!run ? "baseline" : undefined)} />
      {run?.mode === "replay" && <PlaybackControls playback={playback} />}
      <div className="lab-footer">
        <p><ShieldCheck size={16} /> Refund authorization and fake ledger execution are tracked separately.</p>
      </div>
      {!run && <VoiceSlot run={run} preview={preview} />}
    </>
  );
}
