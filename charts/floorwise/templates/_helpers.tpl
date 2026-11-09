{{- define "floorwise.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "floorwise.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "floorwise.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "floorwise.labels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: floorwise
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "floorwise.secretName" -}}
{{- if .Values.secrets.existingName -}}
{{- .Values.secrets.existingName -}}
{{- else -}}
{{- printf "%s-secrets" (include "floorwise.fullname" .) -}}
{{- end -}}
{{- end -}}
