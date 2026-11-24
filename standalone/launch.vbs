Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = ScriptDir
ElectronExe = FSO.BuildPath(ScriptDir, "node_modules\electron\dist\electron.exe")
WshShell.Run """" & ElectronExe & """ .", 0, False
