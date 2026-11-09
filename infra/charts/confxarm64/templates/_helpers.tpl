{{- define "confxarm64.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "confxarm64.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "confxarm64.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "confxarm64.labels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/part-of: confxarm64
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "confxarm64.secretName" -}}
{{- if .Values.secrets.existingName -}}
{{- .Values.secrets.existingName -}}
{{- else -}}
{{- printf "%s-secrets" (include "confxarm64.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "confxarm64.configMapName" -}}
confxarm64-config
{{- end -}}
