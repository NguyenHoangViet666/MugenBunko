param([string]$Root, [string[]]$Only)
$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path }
$taskInput = Join-Path $Root 'artifacts/payment-documents'
$taskOutput = Join-Path $Root '.cache/payment-documents-qa/word-pdfs'
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskWord = $null
$taskDocument = $null
$taskResult = @()
try {
    $taskWord = New-Object -ComObject Word.Application
    $taskWord.Visible = $false
    $taskWord.DisplayAlerts = 0
    $taskWord.AutomationSecurity = 3
    foreach ($taskFile in (Get-ChildItem -LiteralPath $taskInput -Filter '??_*.docx' | Sort-Object Name)) {
        if ($Only -and $taskFile.Name -notin $Only) { continue }
        $taskDocument = $taskWord.Documents.Open($taskFile.FullName, $false, $false, $false)
        $taskDocument.Repaginate()
        $taskDocument.Fields.Update() | Out-Null
        $taskDocument.Save()
        $taskPdf = Join-Path $taskOutput ($taskFile.BaseName + '.pdf')
        $taskDocument.ExportAsFixedFormat($taskPdf, 17)
        $taskPages = $taskDocument.ComputeStatistics(2)
        $taskResult += [pscustomobject]@{File=$taskFile.Name;Pages=$taskPages;Pdf=$taskPdf}
        Write-Output ($taskFile.Name + ' pages=' + $taskPages)
        $taskDocument.Close(0)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskDocument) | Out-Null
        $taskDocument = $null
    }
    $taskResult | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskOutput 'page-counts.json') -Encoding utf8
} finally {
    if ($taskDocument) {
        $taskDocument.Close(0)
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskDocument) | Out-Null
    }
    if ($taskWord) {
        $taskWord.Quit()
        [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($taskWord) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
