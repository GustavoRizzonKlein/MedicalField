# Configures real e-mail on the VM from Windows. The app password is typed here (hidden, paste works)
# and sent to the VM only through the encrypted SSH connection; it is never written on this PC.
# Usage: powershell -ExecutionPolicy Bypass -File deploy\configure-smtp.ps1
param(
    [string]$VmHost = 'univates@177.44.248.72',
    [string]$KeyPath = "$env:USERPROFILE\.ssh\medicalfield_vm"
)

$account = Read-Host 'Conta Gmail que vai enviar'
$secure = Read-Host 'Senha de app do Gmail (16 letras, pode colar com Ctrl+V)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    "$account`n$password`n" | ssh -i $KeyPath $VmHost 'bash /opt/medicalfield/deploy/configure-smtp.sh'
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $password = $null
}
