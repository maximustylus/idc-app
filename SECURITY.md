# Security Policy

## Supported Versions

The following versions of the IDC App are currently supported with security patches and hotfixes.

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.3.x   | :white_check_mark: | **Current Stable (Live)** |
| 1.2.x   | :warning:          | Maintenance Mode |
| < 1.2   | :x:                | End of Life |

## Reporting a Vulnerability

We take the security of patient data and clinician privacy seriously. If you discover a vulnerability in the IDC App or AURA AI modules, please follow these steps:

### How to Report
Please **DO NOT** open a public GitHub issue for sensitive security vulnerabilities.

1.  **Email:** Send a detailed report to the lead developer at `alif@[hidden-for-privacy].sg` or the KKH IT Security Office.
2.  **Subject Line:** Please use `[SECURITY] Vulnerability Report - IDC App v1.3`.
3.  **Details:** Include steps to reproduce the issue and the potential impact (e.g., "Bypass of Domain Lock", "AURA API Key exposure").

### Response Timeline
* **Acknowledgement:** We will acknowledge your report within 48 hours.
* **Assessment:** We will confirm the vulnerability and provide an estimated timeline for a fix within 5 business days.
* **Resolution:** A patch will be deployed to the `main` branch and automatically pushed to the live Firebase host.

### Policy
* We ask that you do not disclose the issue publicly until a patch has been released.
* This project is for internal KKH use; external penetration testing is not authorized without prior written consent from SingHealth/KKH administration.
