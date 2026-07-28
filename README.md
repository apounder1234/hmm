# SUNPATHS — static GitHub Pages build

This folder is already compiled. It requires **no npm install, Node.js, Vite, or GitHub Actions**.

## Publish through GitHub's website

1. Create a new **public** GitHub repository.
2. Upload the contents of this folder to the repository root, preserving the `app` folder.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main**, folder **/(root)**, then **Save**.
6. GitHub will publish the game at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

The site loads React modules from esm.sh when opened, but no packages are installed on your computer or in the repository.
