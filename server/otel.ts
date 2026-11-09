import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

function parseHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined;
  const headers: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    headers[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return headers;
}

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, "");
const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
const consoleExport = process.env.OTEL_CONSOLE === "1";
const serviceName = process.env.OTEL_SERVICE_NAME ?? "confxarm64-api";

export const otelEnabled = Boolean(endpoint || consoleExport);

export const otelStatus = {
  enabled: otelEnabled,
  exporter: endpoint ? "otlp-http" : consoleExport ? "console" : "off",
  endpoint: endpoint ?? null,
  serviceName,
};

if (process.env.OTEL_DIAG === "1") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

function otlpUrl(path: string): string | undefined {
  if (!endpoint) return undefined;
  if (endpoint.endsWith("/v1/traces") || endpoint.endsWith("/v1/metrics")) return endpoint;
  return `${endpoint}${path}`;
}

if (otelEnabled) {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: endpoint
      ? new OTLPTraceExporter({ url: otlpUrl("/v1/traces"), headers })
      : new ConsoleSpanExporter(),
    metricReader: endpoint
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({ url: otlpUrl("/v1/metrics"), headers }),
          exportIntervalMillis: 15000,
        })
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });
  sdk.start();
  console.log(
    `[otel] exporting traces as ${serviceName} via ${otelStatus.exporter}` +
      (endpoint ? ` → ${endpoint}` : ""),
  );
} else {
  console.log("[otel] disabled (set OTEL_EXPORTER_OTLP_ENDPOINT for Dash0)");
}
