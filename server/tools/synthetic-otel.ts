import { metrics } from "@opentelemetry/api";
import { syntheticMetricPoints } from "./synthetic-engagement.ts";

/** Opt-in aggregate gauges only. Never exports names, emails, or lead ids. */
export function maybeStartSyntheticMetrics(): { enabled: boolean; note: string } {
  if (process.env.FLOORWISE_SYNTHETIC_OTEL !== "1") {
    return {
      enabled: false,
      note: "Synthetic OTel export is off. Set FLOORWISE_SYNTHETIC_OTEL=1 to emit aggregate gauges tagged floorwise.synthetic=true to the existing OTLP exporter. Names and emails are never attributes.",
    };
  }
  const meter = metrics.getMeter("floorwise-synthetic-demo");
  const points = syntheticMetricPoints();
  const participants = meter.createObservableGauge("floorwise.synthetic.participants", {
    description: "Synthetic demo participant count (not live attendance)",
  });
  const active = meter.createObservableGauge("floorwise.synthetic.active_now", {
    description: "Synthetic demo participants with join evidence at demo clock",
  });
  const full = meter.createObservableGauge("floorwise.synthetic.observed_full", {
    description: "Synthetic demo participants who met the 90% dwell rule on at least one SAMPLE session",
  });
  const topicInterest = meter.createObservableGauge("floorwise.synthetic.topic_interest", {
    description: "Synthetic demo topic interest counts",
  });
  const attrs = { "floorwise.synthetic": "true", "service.name": points.serviceName };
  participants.addCallback((obs) => obs.observe(points.gauges[0]!.value, attrs));
  active.addCallback((obs) => obs.observe(points.gauges[1]!.value, attrs));
  full.addCallback((obs) => obs.observe(points.gauges[2]!.value, attrs));
  topicInterest.addCallback((obs) => {
    for (const row of points.byTopic) {
      obs.observe(row.value, { ...attrs, topic: row.topic });
    }
  });
  return {
    enabled: true,
    note: "Emitting aggregate synthetic gauges on the process OTLP exporter with floorwise.synthetic=true. Participant identifiers are not included.",
  };
}
