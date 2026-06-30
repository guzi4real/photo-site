# Weekly Meeting List — Setup Guide

## What this does

`meeting_list.py` reads your Outlook weekly calendar PDF, opens a browser
checklist where you select and categorise meetings, then generates a
colour-coded Word document in the same folder as the PDF.

---

## One-time setup

### 1. Check Python is installed

Open **Terminal** and run:

```bash
python3 --version
```

You need Python 3.10 or later. If you see `command not found`, download
Python from https://www.python.org/downloads/

### 2. Install the required libraries

```bash
pip3 install pdfplumber python-docx
```

### 3. Put the script somewhere convenient

Move `meeting_list.py` to a folder you can easily find, for example:

```
~/Documents/MeetingList/meeting_list.py
```

---

## Every week

### Step 1 — Export your Outlook calendar as PDF

In Outlook:
- Go to **File → Print**
- Select your **weekly calendar view** covering the right week
- Choose **Save as PDF** (or print to PDF)
- Save the file anywhere (Desktop is fine)

Repeat for the second calendar if needed, saving as a separate PDF.

### Step 2 — Run the script

Open **Terminal** and run:

```bash
python3 ~/Documents/MeetingList/meeting_list.py /path/to/your/calendar.pdf
```

**Tip:** You can drag the PDF file from Finder into the Terminal window
instead of typing the path.

### Step 3 — Select and categorise

A browser window opens automatically with all extracted meetings listed.
- **Tick** the meetings to include
- **Assign a type** (Council / Parliament / Internal) to each
- Click **Generate Word document**

### Step 4 — Send for review

The `.docx` file is saved in the same folder as your PDF, named
`<your-pdf-name>_meeting_list.docx`. Open it, check it looks right,
and send it to your team leader and deputy.

---

## Tips

- Run the script separately for each PDF if you have two calendars,
  or combine both PDFs into one before running (e.g. with Preview on Mac:
  drag pages from one PDF into the sidebar of another).

- If the browser does not open automatically, go to:
  http://127.0.0.1:8765

- If port 8765 is already in use, edit line ~175 of the script and
  change `8765` to another number (e.g. 8766).

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `ModuleNotFoundError: pdfplumber` | Run `pip3 install pdfplumber` |
| `ModuleNotFoundError: docx` | Run `pip3 install python-docx` |
| No meetings extracted | Make sure you export a **weekly** calendar view, not a monthly one |
| Browser does not open | Open http://127.0.0.1:8765 manually |
