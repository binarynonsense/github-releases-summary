/**
 * @license
 * Copyright 2024 Álvaro García
 * www.binarynonsense.com
 * SPDX-License-Identifier: BSD-2-Clause
 */

import axios from "../libs/axios/axios.min.js";

init();

function init() {
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
  const summaryDiv = document.querySelector("#summary");
  if (!repoOwner || !repoName) {
    summaryDiv.innerHTML = `<p>Invalid owner and/or repository name</p>`;
  } else {
    try {
      // fetch data
      let repoUrl = `https://github.com/${repoOwner}/${repoName}`;
      const releases = await fetchReleasesData(repoOwner, repoName, 50);
      if (releases && releases.length > 0) {
        let totalDownloads = 0;
        let numberReleases = 0;
        let latestRelease;
        let latestStableRelease;
        releases.forEach((data) => {
          numberReleases++;
          totalDownloads += data.total_downloads;
          if (!latestRelease) {
            latestRelease = data;
          }
          if (!latestStableRelease) {
            if (!data.prerelease) {
              latestStableRelease = data;
            }
          }
        });
        // build html
        summaryDiv.innerHTML = `<h1>Releases Summary</h1>`;
        summaryDiv.innerHTML += `<p>Url: ${repoUrl}/releases</p>`;
        summaryDiv.innerHTML += `<p>Number of Releases: ${numberReleases}</p>`;
        summaryDiv.innerHTML += `<p>Total Downloads: ${totalDownloads}</p>`;
        if (latestRelease) {
          summaryDiv.innerHTML += `<h2>"Latest Release:"</h2>`;
          const releaseDiv = getReleaseDiv(latestRelease);
          summaryDiv.appendChild(releaseDiv);
        }
        if (latestStableRelease) {
          summaryDiv.innerHTML += `<h2>"Latest Stable Release:"</h2>`;
          const releaseDiv = getReleaseDiv(latestStableRelease);
          summaryDiv.appendChild(releaseDiv);
        }
      } else {
        summaryDiv.innerHTML = `<p>Couldn't get any release data for the provided repository.</p>`;
      }
    } catch (error) {
      summaryDiv.innerHTML = `<p>Couldn't get any data, an error occurred.</p>`;
    }
  }
}

function getReleaseDiv(data) {
  const div = document.createElement("div");
  div.innerHTML += `<p>Url: ${data.html_url}</p>`;
  div.innerHTML += `<p>Name: ${data.name}</p>`;
  div.innerHTML += `<p>Tag: ${data.tag_name}</p>`;
  div.innerHTML += `<p>Downloads: ${data.total_downloads}</p>`;
  return div;
}

async function fetchReleasesData(repoOwner, repoName, perPage) {
  try {
    let releases = [];
    let nextPageUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases?per_page=${perPage}`;
    const nextPagePattern = /(?<=<)([\S]*)(?=>; rel="Next")/i;
    let getNextPage = true;

    while (getNextPage) {
      const response = await axios.get(nextPageUrl).catch(function (error) {
        if (error.response && error.response.status === 404) {
          //console.clear();
          return undefined;
        }
        //console.log(error.toJSON());
      });

      if (response.data) {
        console.log(response);
        response.data.forEach((releaseData) => {
          releaseData.total_downloads = 0;
          if (releaseData.assets) {
            releaseData.assets.forEach((element) => {
              if (element.download_count)
                releaseData.total_downloads += element.download_count;
            });
          }
          releases.push(releaseData);
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
    return undefined;
  }
}

// references:
// https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28
// https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?tool=javascript&apiVersion=2022-11-28
// https://axios-http.com/docs/example
// https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28#example-creating-a-pagination-method
// https://www.sitepoint.com/get-url-parameters-with-javascript/
// https://axios-http.com/docs/handling_errors
