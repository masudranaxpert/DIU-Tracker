param(
    [string]$Package = 'com.diucse.academictracker',
    [string]$AdbDevice = '',
    [int]$IntervalSec = 3
)

function Invoke-Adb {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AdbArgs)
    if ($AdbDevice) {
        & adb -s $AdbDevice @AdbArgs
    } else {
        & adb @AdbArgs
    }
}

function Get-DeviceMemKb {
    param([string]$Key)
    $raw = Invoke-Adb shell cat /proc/meminfo 2>$null
    foreach ($line in @($raw)) {
        if ($line -match "^${Key}:\s+(\d+)") {
            return [int]$Matches[1]
        }
    }
    return $null
}

function Get-AppSummaryText {
    param([string]$MeminfoText)
    $idx = $MeminfoText.IndexOf('App Summary')
    if ($idx -ge 0) {
        return $MeminfoText.Substring($idx)
    }
    return $MeminfoText
}

function Read-SummaryValue {
    param(
        [string]$Block,
        [string]$Label
    )
    if ($Block -match "(?m)^\s*${Label}:\s+(\d+)") {
        return [int]$Matches[1]
    }
    return $null
}

function To-Mb {
    param([Nullable[int]]$Kb)
    if ($null -eq $Kb) { return '?' }
    return [string][math]::Round($Kb / 1024)
}

Write-Host ''
Write-Host '================================================================================'
Write-Host ' DIU Tracker - RAM log (scrolls down, history stays visible)'
Write-Host " Package: $Package  |  refresh ${IntervalSec}s  |  Ctrl+C to stop"
Write-Host '================================================================================'
Write-Host ''
Write-Host ' Columns (all MB): PSS=total app RAM, NATIVE=Ghostscript/WASM, JAVA=WebView, AVAIL=phone free'
Write-Host ''

$header = '{0,-9} {1,-7} {2,-7} {3,-7} {4,-6} {5,-7} {6,-7} {7}' -f `
    'TIME', 'PID', 'PSS', 'NATIVE', 'JAVA', 'GRAPH', 'AVAIL', 'STATUS'
Write-Host $header
Write-Host ('-' * 80)

$prevPssKb = $null

while ($true) {
    $time = Get-Date -Format 'HH:mm:ss'
    $pidText = (Invoke-Adb shell pidof $Package 2>$null | Out-String).Trim()

    if (-not $pidText) {
        Write-Host ("{0,-9} {1}" -f $time, '[APP NOT RUNNING - open DIU Tracker on phone]')
        $prevPssKb = $null
        Start-Sleep -Seconds $IntervalSec
        continue
    }

    $memRaw = (Invoke-Adb shell dumpsys meminfo $Package 2>$null | Out-String)
    $summary = Get-AppSummaryText $memRaw

    $pssKb = Read-SummaryValue $summary 'TOTAL PSS'
    if ($null -eq $pssKb) {
        if ($summary -match 'TOTAL PSS:\s+(\d+)') {
            $pssKb = [int]$Matches[1]
        }
    }

    $javaKb = Read-SummaryValue $summary 'Java Heap'
    $nativeKb = Read-SummaryValue $summary 'Native Heap'
    $graphKb = Read-SummaryValue $summary 'Graphics'
    $availKb = Get-DeviceMemKb 'MemAvailable'

    $status = 'OK'
    if ($null -ne $availKb -and $availKb -lt 800000) { $status = 'LOW RAM' }
    if ($null -ne $pssKb -and $pssKb -gt 450000) { $status = 'HEAVY' }
    if ($null -ne $pssKb -and $pssKb -gt 600000) { $status = 'VERY HEAVY' }

    if ($null -ne $prevPssKb -and $null -ne $pssKb) {
        $deltaMb = [math]::Round(($pssKb - $prevPssKb) / 1024)
        if ($deltaMb -gt 0) { $status += " (+$deltaMb)" }
        elseif ($deltaMb -lt 0) { $status += " ($deltaMb)" }
    }

    $line = '{0,-9} {1,-7} {2,-7} {3,-7} {4,-6} {5,-7} {6,-7} {7}' -f `
        $time,
        $pidText,
        (To-Mb $pssKb),
        (To-Mb $nativeKb),
        (To-Mb $javaKb),
        (To-Mb $graphKb),
        (To-Mb $availKb),
        $status

    Write-Host $line
    $prevPssKb = $pssKb

    Start-Sleep -Seconds $IntervalSec
}
