import axios from "../libs/axios/axios.min.js";

init();

function init() {
  // ref: https://www.sitepoint.com/get-url-parameters-with-javascript/
  const urlParams = new URLSearchParams(window.location.search);
  const urlOwner = urlParams.get("owner");
  const urlName = urlParams.get("name");
  if (urlOwner) document.getElementById("input-repo-owner").value = urlOwner;
  if (urlName) document.getElementById("input-repo-name").value = urlName;
  if (urlOwner && urlName) {
    generateSummary(urlOwner, urlName);
  }

  const button = document.getElementById("button-repo-generate");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const repoOwner = document.getElementById("input-repo-owner").value;
    const repoName = document.getElementById("input-repo-name").value;
    if (repoOwner && repoName) {
      window.location.search = `?owner=${repoOwner}&name=${repoName}`;
    }
  });
}

async function generateSummary(repoOwner, repoName) {
  const summaryDiv = document.getElementById("summary");
  if (!repoOwner || !repoName) {
    summaryDiv.innerHTML = `<p>Invalid owner and/or repository name</p>`;
  } else {
    let repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    const releases = await getReleasesData(repoOwner, repoName, 50);

    let totalDownloads = 0;
    let numberReleases = 0;
    let latestRelease;
    let latestStableRelease;
    releases.forEach((data) => {
      numberReleases++;
      totalDownloads += data.downloads;
      if (!latestRelease) {
        latestRelease = data;
      }
      if (!latestStableRelease) {
        if (!data.prerelease) {
          latestStableRelease = data;
        }
      }
    });

    summaryDiv.innerHTML = `<h1>Releases Summary</h1>`;
    summaryDiv.innerHTML += `<p>Url: ${repoUrl}/releases</p>`;
    summaryDiv.innerHTML += `<p>Number of Releases: ${numberReleases}</p>`;
    summaryDiv.innerHTML += `<p>Total Downloads: ${totalDownloads}</p>`;
    if (latestRelease) {
      showReleaseData("Latest Release:", latestRelease, summaryDiv);
    }
    if (latestStableRelease) {
      showReleaseData(
        "Latest Stable Release:",
        latestStableRelease,
        summaryDiv
      );
    }
  }
}

function showReleaseData(title, data, div) {
  div.innerHTML += `<h2>${title}</h2>`;
  div.innerHTML += `<p>Url: ${data.url}</p>`;
  div.innerHTML += `<p>Name: ${data.name}</p>`;
  div.innerHTML += `<p>Tag: ${data.tag}</p>`;
  div.innerHTML += `<p>Downloads: ${data.downloads}</p>`;
}

async function getReleasesData(repoOwner, repoName, perPage) {
  try {
    // ref: https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28
    // ref: https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?tool=javascript&apiVersion=2022-11-28
    // ref: https://axios-http.com/docs/example
    // ref: https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28#example-creating-a-pagination-method

    let releases = [];
    let nextPageUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases?per_page=${perPage}`;
    const nextPagePattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
    let getNextPage = true;

    while (getNextPage) {
      const response = await axios.get(nextPageUrl);
      console.log(response);
      if (response.data) {
        response.data.forEach((releaseData) => {
          const relaseSummary = {};
          relaseSummary.name = releaseData.name;
          relaseSummary.tag = releaseData.tag_name;
          relaseSummary.url = releaseData.html_url;
          relaseSummary.downloads = 0;
          if (releaseData.assets) {
            releaseData.assets.forEach((element) => {
              if (element.download_count)
                relaseSummary.downloads += element.download_count;
            });
          }
          releases.push(relaseSummary);
        });
      }
      // more pages?
      const linkHeader = response.headers.link;
      getNextPage = linkHeader && linkHeader.includes(`rel=\"next\"`);
      if (getNextPage) {
        nextPageUrl = linkHeader.match(nextPagePattern)[0];
      }
    } // end while getNextPage

    return releases;
  } catch (error) {
    console.error(error);
  }
}
