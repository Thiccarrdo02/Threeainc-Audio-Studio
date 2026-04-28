$ErrorActionPreference = "Stop"

$previewDir = Join-Path $PSScriptRoot "..\public\previews"
New-Item -ItemType Directory -Force -Path $previewDir | Out-Null

$previews = @(
  @{ Url = "https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-kore.wav"; Name = "Kore.wav" },
  @{ Url = "https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-puck.wav"; Name = "Puck.wav" },
  @{ Url = "https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-charon.wav"; Name = "Charon.wav" },
  @{ Url = "https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-zephyr.wav"; Name = "Zephyr.wav" },
  @{ Url = "https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-aoeda.wav"; Name = "Aoede.wav" }
)

foreach ($preview in $previews) {
  $outFile = Join-Path $previewDir $preview.Name
  Invoke-WebRequest -Uri $preview.Url -OutFile $outFile
}

Get-ChildItem $previewDir | Select-Object Name, Length
