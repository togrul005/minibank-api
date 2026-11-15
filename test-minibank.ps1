# MiniBank API smoke test
# 1) Start the app:  docker compose up --build
#    (or: docker compose up -d db  then  .\mvnw.cmd spring-boot:run)
# 2) In a second PowerShell window:  .\test-minibank.ps1
# Works in Windows PowerShell 5.1 and PowerShell 7.

$Base = "http://localhost:8080/api/v1"
$run  = Get-Random -Maximum 99999          # unique IDs so you can re-run anytime
$A = "A$run"; $B = "B$run"
$pass = 0; $fail = 0

function Call($Method, $Path, $Body = $null, $Headers = @{}) {
    $p = @{ Uri = "$Base$Path"; Method = $Method; Headers = $Headers; ContentType = "application/json"; UseBasicParsing = $true }
    if ($null -ne $Body) { $p.Body = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json } }
    try {
        $r = Invoke-WebRequest @p
        return @{ Status = [int]$r.StatusCode; Json = ($r.Content | ConvertFrom-Json) }
    } catch {
        $resp = $_.Exception.Response
        if ($null -eq $resp) { Write-Host "Cannot reach $Base - is the app running?" -ForegroundColor Red; exit 1 }
        $json = $null; try { $json = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
        return @{ Status = [int]$resp.StatusCode; Json = $json }
    }
}

function Check($Name, $Cond) {
    if ($Cond) { Write-Host "PASS  $Name" -ForegroundColor Green; $script:pass++ }
    else       { Write-Host "FAIL  $Name" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n--- Accounts ---"
$r = Call POST "/accounts" @{ id = $A; initialBalance = 1000 }
Check "Create account A -> 201" ($r.Status -eq 201 -and $r.Json.balance -eq 1000)
$r = Call POST "/accounts" @{ id = $B; initialBalance = 500 }
Check "Create account B -> 201" ($r.Status -eq 201)
$r = Call POST "/accounts" @{ id = $A; initialBalance = 1 }
Check "Duplicate account -> 409" ($r.Status -eq 409)
$r = Call POST "/accounts" @{ id = "X$run"; initialBalance = -5 }
Check "Negative balance -> 400" ($r.Status -eq 400)
$r = Call POST "/accounts" @{ id = ""; initialBalance = 10 }
Check "Blank id -> 400" ($r.Status -eq 400)
$r = Call GET "/accounts/$A"
Check "Get account A -> 200" ($r.Status -eq 200 -and $r.Json.balance -eq 1000)
$r = Call GET "/accounts/NOPE$run"
Check "Unknown account -> 404" ($r.Status -eq 404)
$r = Call GET "/accounts?size=5"
Check "List accounts -> 200" ($r.Status -eq 200 -and $r.Json.totalElements -ge 2)

Write-Host "`n--- Deposit / withdraw ---"
$r = Call POST "/accounts/$B/deposit" @{ amount = 100 }
Check "Deposit 100 into B -> 600" ($r.Status -eq 200 -and $r.Json.balanceAfter -eq 600)
$r = Call POST "/accounts/$B/withdraw" @{ amount = 100 }
Check "Withdraw 100 from B -> 500" ($r.Status -eq 200 -and $r.Json.balanceAfter -eq 500)
$r = Call POST "/accounts/$B/withdraw" @{ amount = 99999 }
Check "Withdraw too much -> 422" ($r.Status -eq 422)

Write-Host "`n--- Transfers ---"
$r = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 100 }
$tid = $r.Json.transferId
Check "Transfer 100 A->B -> 200" ($r.Status -eq 200 -and $r.Json.fromBalanceAfter -eq 900 -and $r.Json.toBalanceAfter -eq 600)
$r = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 999999 }
Check "Insufficient funds -> 422" ($r.Status -eq 422)
$r = Call POST "/transfers" @{ fromId = $A; toId = $A; amount = 1 }
Check "Same account -> 400" ($r.Status -eq 400)
$r = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 0 }
Check "Zero amount -> 400" ($r.Status -eq 400)
$r = Call POST "/transfers" @{ fromId = $A; toId = "NOPE$run"; amount = 1 }
Check "Transfer to unknown account -> 404" ($r.Status -eq 404)

Write-Host "`n--- Idempotency ---"
$key = @{ "Idempotency-Key" = "key-$run" }
$r1 = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 50 } $key
$r2 = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 50 } $key
Check "Same key twice -> same transferId" ($r1.Json.transferId -eq $r2.Json.transferId)
$r = Call GET "/accounts/$A"
Check "Money moved only once (A = 850)" ($r.Json.balance -eq 850)
$r = Call POST "/transfers" @{ fromId = $A; toId = $B; amount = 70 } $key
Check "Same key, different amount -> 409" ($r.Status -eq 409)

Write-Host "`n--- Transfer lookup / history ---"
$r = Call GET "/transfers/$tid"
Check "Get transfer by id -> 200" ($r.Status -eq 200 -and $r.Json.id -eq $tid)
$r = Call GET "/transfers/does-not-exist"
Check "Unknown transfer -> 404" ($r.Status -eq 404)
$r = Call GET "/accounts/$A/transfers"
Check "History of A has 2 entries" ($r.Status -eq 200 -and $r.Json.totalElements -eq 2)
$r = Call GET "/accounts/$A/transfers?size=1"
Check "size=1 returns 1" (@($r.Json.content).Count -eq 1)
$r = Call GET "/accounts/$A/transfers?size=0"
Check "size=0 -> 400" ($r.Status -eq 400)

Write-Host "`n--- Error handling ---"
$r = Call POST "/transfers" '{ "fromId": "A", "toId": '
Check "Broken JSON -> 400" ($r.Status -eq 400)
$r = Call GET "/accounts/$A/transfers?page=abc"
Check "page=abc -> 400" ($r.Status -eq 400)
$r = Call GET "/this-route-does-not-exist"
Check "Unknown route -> 404" ($r.Status -eq 404)

Write-Host "`nResult: $pass passed, $fail failed`n" -ForegroundColor Cyan
