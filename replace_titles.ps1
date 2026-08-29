Get-ChildItem -Path 'd:\hospital\harmony-health-hub\src\routes' -Filter *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName
    $content = $content -replace 'MediCore HMS', 'Lifecare Hospital'
    Set-Content -Path $_.FullName -Value $content
}
