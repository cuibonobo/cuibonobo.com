---
title: Fixing a bad Windows update
tags: windows, troubleshooting, pc
created: 2021-09-06T21:18:52-04:00
updated: 2021-09-07T23:14:42-04:00
---

<video controls loop preload="metadata" src="/media/2021/09/git-status-hell.mp4">
	Your browser does not support the HTML5 video tag.
</video>

I started experiencing really terrible PC performance last Friday and I assumed it was related some network issue at the office because I had commuted to work that day instead of working from home. Unfortunately the bad performance continued on my home network so I decided to investigate further. On the day the bad performance started there had been a Windows Update for "Security Update for Windows (KB5005260)", so this was the likely culprit. In the application for uninstalling updates this update appears as "Servicing Stack 10.0.19041.1161", but unfortunately the option for uninstalling it is disabled.

I looked around online for some way to disable or uninstall the update and I found [an answer on SuperUser](https://superuser.com/a/1661509/242807) that suggested running the following commands:

```batch
DISM /online /cleanup-image /restorehealth
sfc /scannow
```

The first command [attempts to restore the Windows image to a working state](https://docs.microsoft.com/en-us/windows-hardware/manufacture/desktop/repair-a-windows-image) and the second command [attempts to detect corrupt system files](https://support.microsoft.com/en-us/topic/use-the-system-file-checker-tool-to-repair-missing-or-corrupted-system-files-79aa86cb-ca52-166a-92a3-966e85d4094e). I was honestly skeptical that either of them would work but I decided to try it anyway. Before running them a simple command like `git status` would take 8-10 seconds to complete. After running the commands the same command would take less than a second.

I'll definitely reach for this solution first before attempting to brute-uninstall funky Windows updates.
