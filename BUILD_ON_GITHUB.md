How to trigger an automated Android APK build on GitHub

This repository now includes a GitHub Actions workflow at `.github/workflows/android-build.yml` that runs a Gradle `assembleRelease` and uploads APK(s) as an artifact named `app-release-apks`.

Steps to trigger the build

1. Commit & push any changes to GitHub (to the `main` branch or a `build/*` branch). The workflow runs on push to `main` or to branches matching `build/**`.

2. After the workflow completes, download the artifact from the Actions run page (look for `app-release-apks`).

Notes & signing

- The runner builds using `./android/gradlew assembleRelease`. If your repository has a signing configuration and required keystore files, the produced APK will be signed. Otherwise the APK may be unsigned and you will need to sign it locally or provide signing secrets/keystore to the workflow.
- If you want me to automatically publish the resulting APK(s) into a GitHub Release, provide a Personal Access Token (PAT) with `repo` or `public_repo` scope and either set it in the repository secrets or provide it for a separate publish step.

Security

- Do not commit private keystores or credentials into the repo. Use GitHub repository secrets if you need the workflow to sign APKs.
