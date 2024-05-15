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
  showLoading(true);
  const summaryDiv = document.querySelector("#summary-div");
  if (!repoOwner || !repoName) {
    summaryDiv.innerHTML = `<p>Invalid owner and/or repository name</p>`;
  } else {
    try {
      // fetch data
      let repoUrl = `https://github.com/${repoOwner}/${repoName}`;
      const releases = await fetchReleasesData(repoOwner, repoName, 50);
      if (releases && releases.length > 0) {
        let hasTotalDownloads = false;
        let totalDownloads = 0;
        let numberReleases = 0;
        let latestRelease;
        let latestStableRelease;
        releases.forEach((data) => {
          numberReleases++;
          if (data.has_total_downloads) {
            hasTotalDownloads = true;
          }
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
          getGeneralInfoDiv(
            repoUrl,
            numberReleases,
            hasTotalDownloads ? totalDownloads : -1
          )
        );
        // latest release
        if (latestRelease) {
          summaryDiv.appendChild(getSectionTitleDiv("Latest Release:"));
          summaryDiv.appendChild(getReleaseInfoDiv(latestRelease));
        }
        // latest stable release
        if (latestStableRelease) {
          summaryDiv.appendChild(getSectionTitleDiv("Latest Stable Release:"));
          summaryDiv.appendChild(getReleaseInfoDiv(latestStableRelease));
        }
        // all releases
        summaryDiv.appendChild(getSectionTitleDiv("All Releases:"));
        releases.forEach((data) => {
          summaryDiv.appendChild(getReleaseInfoDiv(data, true));
        });
      } else {
        summaryDiv.innerHTML = `<p>Couldn't get any release data for the provided repository.</p>`;
      }
      showLoading(false);
    } catch (error) {
      showLoading(false);
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

function getGeneralInfoDiv(repoUrl, numberReleases, totalDownloads) {
  const div = document.createElement("div");
  div.id = "info-div";
  let innerHTML = "<div class='info-body'>";
  innerHTML += "<ul>";
  innerHTML += `<li>URL: <a href="${repoUrl}/releases">${repoUrl}/releases</a></li>`;
  innerHTML += `<li>Number of Releases: ${numberReleases}</li>`;
  if (totalDownloads >= 0)
    innerHTML += `<li>File Downloads: <b>${totalDownloads}</b></li>`;
  innerHTML += "</ul>";
  innerHTML += "</div>";
  div.innerHTML += innerHTML;
  return div;
}

function getReleaseInfoDiv(data, collapsed = false) {
  const infoDiv = document.createElement("div");
  infoDiv.id = "info-div";
  let innerHTML = "";
  /////////////
  innerHTML += `<div class="info-header">`;
  innerHTML += `<span><b>${data.name}</b></span>`;
  if (data.prerelease) {
    innerHTML += `<div class="info-header-tag"><span>pre-release</span></div>`;
  }
  innerHTML += `<div class="info-header-button"><span class="info-header-button-text" ${
    collapsed ? "title='expand'" : "title='collapse'"
  }>${collapsed ? "+" : "-"}</span></div>`;
  innerHTML += `</div>`;
  /////////////
  innerHTML += `<div class="info-body${collapsed ? " hidden" : ""}">`;
  innerHTML += "<ul>";
  let date = new Date(data.published_at);
  innerHTML += `<li>Date: ${date.toLocaleString()}</li>`;
  innerHTML += `<li>Tag: ${data.tag_name}</li>`;
  innerHTML += `<li>URL: <a href="${data.html_url}">${data.html_url}</a></li>`;
  {
    innerHTML += `<li>Source Code:`;
    innerHTML += "<ul>";
    innerHTML += `<li><a href="${data.zipball_url}">zip</a></li>`;
    innerHTML += `<li><a href="${data.tarball_url}">tar.gz</a></li>`;
    innerHTML += "</ul>";
    innerHTML += `</li>`;
  }
  if (data.assets.length > 0) {
    innerHTML += `<li>Files (${data.total_downloads} downloads):`;
    innerHTML += "<ul>";
    data.assets.forEach((file) => {
      innerHTML += `<li><a href="${file.browser_download_url}">${
        file.name
      }</a> (${(file.size / 1024 / 1024).toFixed(2)} MiB) (${
        file.download_count
      } downloads)</li>`;
    });
    innerHTML += "</ul>";
    innerHTML += `</li>`;
  }
  innerHTML += "</ul>";
  /////////////
  innerHTML += "</div>";
  infoDiv.innerHTML += innerHTML;
  // button behavior
  const headerButtonDiv = infoDiv.querySelector(".info-header-button");
  headerButtonDiv.addEventListener("click", (event) => {
    if (infoDiv.querySelector(".info-body").classList.contains("hidden")) {
      infoDiv.querySelector(".info-body").classList.remove("hidden");
      headerButtonDiv.innerHTML = `<span class="info-header-button-text" title="collapse">-</span>`;
    } else {
      infoDiv.querySelector(".info-body").classList.add("hidden");
      headerButtonDiv.innerHTML = `<span class="info-header-button-text" title="expand">+</span>`;
    }
  });
  /////////////
  return infoDiv;
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
          releaseData.has_total_downloads = false;
          releaseData.total_downloads = 0;
          if (releaseData.assets) {
            releaseData.assets.forEach((element) => {
              if (element.download_count) {
                releaseData.has_total_downloads = true;
                releaseData.total_downloads += element.download_count;
              }
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

function showLoading(show) {
  if (show) {
    document.querySelector("#loading").classList.add("is-active");
  } else {
    document.querySelector("#loading").classList.remove("is-active");
  }
}

// references:
// https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28
// https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?tool=javascript&apiVersion=2022-11-28
// https://axios-http.com/docs/example
// https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api?apiVersion=2022-11-28#example-creating-a-pagination-method
// https://www.sitepoint.com/get-url-parameters-with-javascript/
// https://axios-http.com/docs/handling_errors
