$modules = @('Settings', 'Employees', 'Reception', 'OPD', 'Medical')
foreach ($mod in $modules) {
    $body = @{
        roleName = 'Admin'
        moduleName = $mod
        actionName = 'Access'
        isAllowed = $true
        isLocked = $false
    } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:5037/api/RolePermission' -Method Post -Body $body -ContentType 'application/json'
}
