#!/usr/bin/env python3
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def column_number(ref):
    letters = "".join(re.findall(r"[A-Z]+", ref))
    number = 0
    for letter in letters:
        number = number * 26 + ord(letter) - 64
    return number


def normalize(value):
    return (
        str(value or "")
        .strip()
        .replace("`", "")
        .replace("\n", " ")
        .replace("?", "")
        .replace("(", "")
        .replace(")", "")
        .replace("/", " ")
        .replace("-", " ")
        .lower()
    )


def normalize_key(value):
    return re.sub(r"\s+", "_", normalize(value))


def clean(value):
    if value is None:
        return ""
    text = str(value).replace("\n", " ").strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def as_number(value):
    if value in ("", None):
        return None
    try:
        return float(value)
    except ValueError:
        return None


def excel_date(value):
    number = as_number(value)
    if number is None:
        return clean(value)
    if number < 20000 or number > 70000:
        return clean(value)
    date = datetime(1899, 12, 30) + timedelta(days=number)
    return date.strftime("%Y-%m-%d")


def load_shared_strings(zf):
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    values = []
    for item in root.findall("a:si", NS):
        values.append("".join(node.text or "" for node in item.iter() if node.tag.endswith("}t")))
    return values


def workbook_sheet_targets(zf):
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
    out = {}
    for sheet in workbook.find("a:sheets", NS):
        rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        out[sheet.attrib["name"]] = "xl/" + relmap[rid].lstrip("/")
    return out


def read_sheet(zf, target, shared):
    root = ET.fromstring(zf.read(target))
    rows = []
    for row in root.findall(".//a:sheetData/a:row", NS):
        values = {}
        for cell in row.findall("a:c", NS):
            ref = cell.attrib.get("r", "")
            value_node = cell.find("a:v", NS)
            value = ""
            if value_node is not None:
                value = value_node.text or ""
                if cell.attrib.get("t") == "s":
                    value = shared[int(value)]
            values[column_number(ref)] = value
        max_col = max(values.keys(), default=0)
        rows.append([values.get(index, "") for index in range(1, max_col + 1)])
    return rows


def records_from_rows(rows, header_index):
    if len(rows) <= header_index:
        return []
    headers = [normalize_key(value) for value in rows[header_index]]
    records = []
    for row in rows[header_index + 1 :]:
        record = {}
        for index, header in enumerate(headers):
            if header:
                record[header] = row[index] if index < len(row) else ""
        if any(clean(value) for value in record.values()):
            records.append(record)
    return records


def tier_group(value):
    text = clean(value).lower()
    if text.startswith("1") or "tier 1" in text:
        return "Tier 1"
    if text.startswith("2") or "tier 2" in text:
        return "Tier 2"
    if text.startswith("3") or "tier 3" in text:
        return "Tier 3"
    return "Tier 4"


def schedule_record(raw, index):
    return {
        "id": f"svc-{index + 1:04d}",
        "pillar": clean(raw.get("pillar")),
        "name": clean(raw.get("service_name")),
        "tier": tier_group(raw.get("tiering")),
        "tiering": clean(raw.get("tiering")),
        "testType": clean(raw.get("test_type")),
        "fullScalePast12m": clean(raw.get("full_scale_interruption_in_the_past_12m")),
        "serviceType": clean(raw.get("service_type")),
        "baseNextTest": clean(raw.get("base_next_test")),
        "recommendedNextTest": clean(raw.get("recommended_next_test")),
        "jiraReference": clean(raw.get("jira_reference")),
        "owner": clean(raw.get("accountable_team")),
        "contacts": clean(raw.get("main_contacts")),
        "quarter": clean(raw.get("quarter")),
        "quarterDate": excel_date(raw.get("quarter_date")),
        "rtStart": excel_date(raw.get("rt_start")),
        "dueDate": excel_date(raw.get("rt_due_date")),
        "status": clean(raw.get("status")),
        "completionWeek": clean(raw.get("completion_week")),
        "completionMonth": clean(raw.get("completion_month")),
        "completedOnTime": clean(raw.get("completed_on_time")),
        "testingAbilityPosture": clean(raw.get("testing_ability_posture")),
        "testingAbilityScore": as_number(raw.get("testing_ability_score")),
        "resiliencePostureLevel": clean(raw.get("resilience_posture_level")),
        "resiliencePostureScore": as_number(raw.get("resilience_posture_score")),
        "architecturalRiskPosture": clean(raw.get("architectural_risk_posture")),
        "architecturalRiskScore": as_number(raw.get("architectural_risk_score")),
        "riskAlignmentLevel": clean(raw.get("risk_alignment_level")),
        "riskAlignmentScore": as_number(raw.get("risk_alignment_score")),
        "aggregateScore": as_number(raw.get("aggregate_score_max_14_service")),
        "documentationLink": clean(raw.get("documentation_link")),
        "checklistLink": clean(raw.get("checklist_link")),
        "latestReviewReport": clean(raw.get("latest_review_report")),
        "notes": clean(raw.get("notes")),
    }


def risk_record(raw):
    return {
        "reviewInstanceId": clean(raw.get("review_instance_id")),
        "serviceName": clean(raw.get("service_name")),
        "pillar": clean(raw.get("pillar")),
        "tier": tier_group(raw.get("tier")),
        "tiering": clean(raw.get("tier")),
        "quarter": clean(raw.get("quarter")),
        "quarterDate": excel_date(raw.get("quarter_date")),
        "jiraReference": clean(raw.get("jira_reference")),
        "status": clean(raw.get("status")),
        "reviewDueDate": excel_date(raw.get("review_due_date")),
        "fullScaleLast12m": clean(raw.get("full_scale_last_12m")),
        "currentTestType": clean(raw.get("current_test_type")),
        "recommendedNextTest": clean(raw.get("recommended_next_test")),
        "testingAbilityScore": as_number(raw.get("testing_ability_score")),
        "resiliencePostureScore": as_number(raw.get("resilience_posture_score")),
        "architecturalRiskScore": as_number(raw.get("architectural_risk_score")),
        "riskAlignmentScore": as_number(raw.get("risk_alignment_score")),
        "simulationViolation": as_number(raw.get("simulation_violation")),
        "testingAbilityViolation": as_number(raw.get("testing_ability_violation")),
        "resiliencePostureViolation": as_number(raw.get("resilience_posture_violation")),
        "architecturalRiskViolation": as_number(raw.get("architectural_risk_violation")),
        "riskAlignmentViolation": as_number(raw.get("risk_alignment_violation")),
        "fullScaleViolation": as_number(raw.get("full_scale_violation")),
        "dimensionViolationCount": as_number(raw.get("dimension_violation_count")),
        "totalViolationCount": as_number(raw.get("total_violation_count")),
        "urgencyRank": as_number(raw.get("urgency_rank")),
        "urgencyLabel": clean(raw.get("urgency_label")),
        "primaryRiskDriver": clean(raw.get("primary_risk_driver")),
        "secondaryRiskDriver": clean(raw.get("secondary_risk_driver")),
    }


def main():
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])
    with ZipFile(source) as zf:
        shared = load_shared_strings(zf)
        targets = workbook_sheet_targets(zf)
        schedule_rows = read_sheet(zf, targets["Product Services 2026 schedule"], shared)
        risk_rows = read_sheet(zf, targets["Risk Engine"], shared)
        dashboard_rows = read_sheet(zf, targets["DashboardData"], shared)

    schedule_raw = records_from_rows(schedule_rows, 0)
    risk_raw = records_from_rows(risk_rows, 1)
    dashboard_raw = records_from_rows(dashboard_rows, 0)

    payload = {
        "sourceWorkbook": source.name,
        "extractedAt": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "services": [schedule_record(row, index) for index, row in enumerate(schedule_raw) if clean(row.get("service_name"))],
        "riskEngine": [risk_record(row) for row in risk_raw if clean(row.get("service_name"))],
        "dashboardData": {clean(row.get("metric")): as_number(row.get("value")) for row in dashboard_raw if clean(row.get("metric"))},
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {output} with {len(payload['services'])} services and {len(payload['riskEngine'])} risk rows")


if __name__ == "__main__":
    main()
