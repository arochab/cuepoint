# notify.ps1 — Windows toast notification for KAPMAN cycle completion
# Called by cycle-runner.sh after each cycle.
# Requires Windows 10/11 (WinRT toast API).
param(
  [string]$Cycle      = "?",
  [string]$Branch     = "unknown",
  [string]$ReportPath = ""
)

# Load WinRT assemblies for toast notifications
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$title   = "KAPMAN — Cycle $Cycle/8 ready for review"
$line1   = "One improvement was made and tested."
$line2   = "Branch: $Branch"
$line3   = if ($ReportPath) { "Report: $ReportPath" } else { "See reports/latest-review.md" }

$toastXml = @"
<toast duration="long">
  <visual>
    <binding template="ToastGeneric">
      <text>$title</text>
      <text>$line1</text>
      <text>$line2</text>
      <text>$line3</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Default" />
</toast>
"@

try {
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($toastXml)
  $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
  # "KAPMAN Toolkit" is the app ID shown in Action Center
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("KAPMAN Toolkit").Show($toast)
  Write-Host "Toast notification sent: $title"
} catch {
  # Fallback: console bell + message if WinRT is unavailable
  Write-Host "`a"
  Write-Host ""
  Write-Host "*** KAPMAN REVIEW NEEDED ***"
  Write-Host $title
  Write-Host $line2
  Write-Host $line3
  Write-Host "****************************"
}
