"""Test the OCR parser against various certificate text formats."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.ocr import parse_certificate_text

# Test cases: real certificate text patterns from major platforms

tests = [
    # 1. AWS Certification
    (
        "AWS Certified Solutions Architect - Associate",
        """Amazon Web Services
AWS Certified Solutions Architect - Associate
This is to certify that
John Smith
has successfully completed the AWS Certified Solutions Architect - Associate certification exam.
Credential ID: AWS-ASA-2024-78432
Issue Date: March 15, 2024
Expiration Date: March 15, 2027
Validate at: https://aws.amazon.com/verification/ABC123XYZ""",
    ),
    # 2. Microsoft Azure
    (
        "Microsoft Azure",
        """Microsoft
Microsoft Certified: Azure Developer Associate
Certificate Number: MS-AZ204-889912
Awarded to: Priya Sharma
Date of Achievement: January 8, 2025
This certification expires on January 8, 2027
Microsoft Corporation""",
    ),
    # 3. Google Cloud
    (
        "Google Cloud",
        """Google Cloud
Professional Cloud Architect
This certifies that
Rahul Kumar
has met the requirements for Google Cloud Professional Cloud Architect
Credential ID: GCP-PCA-2024-55123
Issued: 2024-06-20
Valid until: 2026-06-20""",
    ),
    # 4. Scrum Alliance CSM
    (
        "Scrum Master",
        """Scrum Alliance
Certified ScrumMaster
This is to certify that
Sarah Johnson
is a Certified ScrumMaster
Certificate Number: 001234567
Member Since: September 2023
Certification Expires: September 2025""",
    ),
    # 5. Coursera (generic)
    (
        "Coursera - IBM Data Science",
        """coursera
Nov 5, 2024
RAVI PATEL
has successfully completed the online Professional Certificate
IBM Data Science
This 10-course program provides the tools and skills to succeed in data science.
Verify this certificate at:
https://coursera.org/verify/professional-cert/ABCD1234EFGH""",
    ),
    # 6. CompTIA Security+
    (
        "CompTIA Security+",
        """CompTIA
CompTIA Security+ Certified
Certification Number: COMP001025678
Candidate: Alex Chen
Date Certified: 2024-02-15
Expires: 2027-02-15
CompTIA, Inc.""",
    ),
    # 7. PMP / PMI
    (
        "PMP",
        """Project Management Institute
Project Management Professional (PMP)
PMI ID: 3456789
Certified: David Martinez
Certification Date: 15 August 2023
Renewal Date: 15 August 2026
PMI - Project Management Institute""",
    ),
    # 8. Udemy (no expiry)
    (
        "Udemy",
        """Certificate of Completion
React - The Complete Guide 2024
This certificate is presented to
Ananya Reddy
for successfully completing the course
Date of Completion: December 20, 2024
Instructor: Maximilian Schwarzmuller
Length: 68 total hours
Certificate no UC-12345678-abcd-efgh""",
    ),
    # 9. Cisco CCNA
    (
        "Cisco CCNA",
        """Cisco
CCNA - Cisco Certified Network Associate
This is to certify that
Mohammed Ali
has met the qualifications as a Cisco Certified Network Associate
Cisco ID: CSCO14567890
Certified: 04/10/2024
Valid Through: 04/10/2027""",
    ),
    # 10. Generic/Unknown
    (
        "Generic certificate",
        """National Institute of Technology
Certificate of Achievement in Advanced Machine Learning
Awarded to: Deepa Krishnan
This certificate is issued on completion of the 6-month program.
Certificate No: NIT-ML-2024-0789
Date: 15/03/2024""",
    ),
]

print("=" * 70)
print("CERTIFICATE OCR PARSER TEST RESULTS")
print("=" * 70)

for label, text in tests:
    result = parse_certificate_text(text)
    print(f"\n{'-' * 70}")
    print(f"  [{label}]")
    print(f"{'-' * 70}")
    print(f"  Name:     {result.certificate_name or 'X not found'}")
    print(f"  Number:   {result.certificate_number or 'X not found'}")
    print(f"  Issuer:   {result.issuing_authority or 'X not found'}")
    print(f"  Issued:   {result.issued_date or 'X not found'}")
    print(f"  Expiry:   {result.expiry_date or '-- (none/lifetime)'}")
    print(f"  Category: {result.category or 'X not found'}")
    print(f"  Confidence: {int(result.confidence * 100)}%")

print(f"\n{'=' * 70}")
print("DONE")
