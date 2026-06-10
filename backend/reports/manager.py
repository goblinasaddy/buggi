import os
import json
import datetime
from typing import Dict, Any, List
from backend.config import REPORTS_DIR, ARTIFACTS_DIR

class LocalReportManager:
    @staticmethod
    def generate_report(scan_id: str, target_url: str, findings: List[Dict[str, Any]], profile_name: str) -> Dict[str, str]:
        """
        Generates and saves a scan report locally in Markdown and JSON formats under /reports.
        Returns a dict containing the file paths.
        """
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_target = target_url.replace("https://", "").replace("http://", "").replace("/", "_").replace(":", "_")
        
        report_title = f"Buggi Assessment Report - {target_url}"
        
        # Prepare JSON report structure
        report_data = {
            "scan_id": scan_id,
            "target_url": target_url,
            "profile_name": profile_name,
            "generated_at": datetime.datetime.utcnow().isoformat(),
            "findings_count": len(findings),
            "findings": findings
        }
        
        # Paths
        json_filename = f"report_{safe_target}_{timestamp}.json"
        md_filename = f"report_{safe_target}_{timestamp}.md"
        
        json_path = os.path.join(REPORTS_DIR, json_filename)
        md_path = os.path.join(REPORTS_DIR, md_filename)
        
        # Write JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=4)
            
        # Compile Markdown Content
        md_content = f"""# {report_title}

**Target URL:** {target_url}  
**Program Profile:** {profile_name}  
**Date Generated:** {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}  
**Scan ID:** `{scan_id}`  

---

## Executive Summary
Buggi completed an autonomous vulnerability assessment of the target.
* Total Findings: **{len(findings)}**
* Critical Severity: **{sum(1 for f in findings if f['severity'].lower() == 'critical')}**
* High Severity: **{sum(1 for f in findings if f['severity'].lower() == 'high')}**
* Medium Severity: **{sum(1 for f in findings if f['severity'].lower() == 'medium')}**
* Low Severity: **{sum(1 for f in findings if f['severity'].lower() == 'low')}**

---

## Findings Details
"""
        if not findings:
            md_content += "\nNo vulnerabilities identified during this assessment.\n"
        else:
            for idx, finding in enumerate(findings, 1):
                md_content += f"""
### {idx}. [{finding['severity'].upper()}] {finding['title']}
* **Status:** {finding['status']}
* **Confidence Score:** {finding['confidence']}
* **Target Endpoint/Parameter:** `{finding['target']}`

#### Description
This vulnerability was detected and automatically verified by Buggi's agent workflows.

#### Evidence / Reproduction Steps
```json
{json.dumps(finding.get('evidence', {}), indent=2)}
```

---
"""
        
        # Write Markdown
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            
        return {
            "json_path": json_path,
            "markdown_path": md_path,
            "json_filename": json_filename,
            "markdown_filename": md_filename
        }

    @staticmethod
    def save_artifact(scan_id: str, name: str, data: Any, ext: str = "txt") -> str:
        """
        Saves a raw security scan artifact (like HTTP request/response text) to /artifacts.
        Returns the absolute filepath.
        """
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{scan_id}_{name}_{timestamp}.{ext}"
        filepath = os.path.join(ARTIFACTS_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            if isinstance(data, dict) or isinstance(data, list):
                json.dump(data, f, indent=4)
            else:
                f.write(str(data))
                
        return filepath
