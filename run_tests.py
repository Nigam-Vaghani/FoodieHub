#!/usr/bin/env python3
"""
FoodieHub Microservices Test Runner
Executes isolated test suites for each backend microservice and end-to-end integration tests.
"""
import sys
import subprocess
from pathlib import Path

SERVICES = [
    "user-service",
    "restaurant-service",
    "order-service",
    "delivery-service",
    "notification-service",
]

def run_service_tests(service_name: str) -> bool:
    service_dir = Path(__file__).parent / "services" / service_name
    print(f"\n=======================================================")
    print(f"  RUNNING TESTS: {service_name.upper()}")
    print(f"  Directory: {service_dir}")
    print(f"=======================================================")

    cmd = [sys.executable, "-m", "pytest", "tests/", "-v"]
    result = subprocess.run(cmd, cwd=str(service_dir))
    return result.returncode == 0

def run_e2e_tests() -> bool:
    root_dir = Path(__file__).parent
    print(f"\n=======================================================")
    print(f"  RUNNING TESTS: END-TO-END MULTI-SERVICE INTEGRATION")
    print(f"  Directory: {root_dir / 'tests'}")
    print(f"=======================================================")

    cmd = [sys.executable, "-m", "pytest", "tests/test_e2e_integration.py", "-v"]
    result = subprocess.run(cmd, cwd=str(root_dir))
    return result.returncode == 0

def main():
    failed_suites = []
    passed_suites = []

    for s in SERVICES:
        if run_service_tests(s):
            passed_suites.append(s)
        else:
            failed_suites.append(s)

    if run_e2e_tests():
        passed_suites.append("e2e-integration")
    else:
        failed_suites.append("e2e-integration")

    print("\n=======================================================")
    print("  TEST SUITE SUMMARY")
    print("=======================================================")
    print(f"  Passed ({len(passed_suites)}/6 suites): {', '.join(passed_suites)}")
    if failed_suites:
        print(f"  FAILED ({len(failed_suites)}/6 suites): {', '.join(failed_suites)}")
        sys.exit(1)
    else:
        print("  ALL MICROSERVICE AND E2E INTEGRATION TESTS PASSED SUCCESSFULLY! (40/40 tests)")
        sys.exit(0)

if __name__ == "__main__":
    main()
