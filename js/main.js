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
  if (urlOwner) document.getElementById("repo-owner-input").value = urlOwner;
  if (urlName) document.getElementById("repo-name-input").value = urlName;
  if (urlOwner && urlName) {
    generateSummary(urlOwner, urlName);
  }

  const button = document.getElementById("repo-generate-button");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const repoOwner = document.getElementById("repo-owner-input").value;
    const repoName = document.getElementById("repo-name-input").value;
    if (repoOwner && repoName) {
      window.location.search = `?owner=${repoOwner}&name=${repoName}`;
    }
  });
}

async function generateSummary(repoOwner, repoName) {
  const summaryDiv = document.querySelector("#summary-div");
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
        // general info
        summaryDiv.appendChild(getSectionTitleDiv("Releases Summary:"));
        summaryDiv.appendChild(
          getInfoDiv(repoUrl, numberReleases, totalDownloads)
        );
        // latest release
        if (latestRelease) {
          summaryDiv.appendChild(getSectionTitleDiv("Latest Release:"));
          summaryDiv.appendChild(getReleaseDiv(latestRelease));
        }
        // latest stable release
        if (latestStableRelease) {
          summaryDiv.appendChild(getSectionTitleDiv("Latest Stable Release:"));
          summaryDiv.appendChild(getReleaseDiv(latestStableRelease));
        }
      } else {
        summaryDiv.innerHTML = `<p>Couldn't get any release data for the provided repository.</p>`;
      }
    } catch (error) {
      summaryDiv.innerHTML = `<p>Couldn't get any data, an error occurred.</p>`;
      console.error(error);
    }
  }
}

function getSectionTitleDiv(title) {
  const div = document.createElement("div");
  div.className = "section-name";
  div.innerHTML += `<span>${title}</span>`;
  return div;
}

function getInfoDiv(repoUrl, numberReleases, totalDownloads) {
  const div = document.createElement("div");
  div.id = "info-div";
  div.innerHTML += "<ul>";
  div.innerHTML += `<li>Url: <a href="${repoUrl}/releases">${repoUrl}/releases</a></li>`;
  div.innerHTML += `<li>Number of Releases: ${numberReleases}</li>`;
  div.innerHTML += `<li>Total Downloads: <b>${totalDownloads}</b></li>`;
  div.innerHTML += "</ul>";
  return div;
}

function getReleaseDiv(data) {
  const div = document.createElement("div");
  div.id = "info-div";
  div.innerHTML += "<ul>";
  div.innerHTML += `<li>Name: ${data.name}</li>`;
  div.innerHTML += `<li>Tag: ${data.tag_name}</li>`;
  div.innerHTML += `<li>Url: <a href="${data.html_url}">${data.html_url}</a></li>`;
  div.innerHTML += `<li>Downloads: ${data.total_downloads}</li>`;
  div.innerHTML += "</ul>";
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
        console.log("raw releases data:");
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
