"use strict";

let _ = require("lodash");
let Q = require("q");
let fs = require("fs");
let path = require("path");
let wrench = require("wrench");
let AdmZip = require("adm-zip");

let fsCommons = require("nodebb-plugin-emoji-extended/lib/commons/fs");
let downloadCommons = require("nodebb-plugin-emoji-extended/lib/commons/download");
let index = require("./index");

const ARCHIVE = "http://emojione.com/wp-content/uploads/assets/e1-svg.zip";
const FILES_PREFIX = "https://raw.githubusercontent.com/Ranks/emojione/master/";

let updating = null;

/*===================================================== Exports  =====================================================*/

module.exports = update;

/*==================================================== Functions  ====================================================*/

function update(assetsPath) {
  if (updating == null) {
    updating = flow(assetsPath);
    updating.done(updateDone, updateDone);
  }
  return updating;
}

function flow(assetsPath) {
  return downloadSVGFiles(assetsPath)
      .then(function () { return downloadStaticFiles(assetsPath); })
      .then(function () { return index.build(assetsPath); });
}

function downloadSVGFiles(assetsPath) {
  wrench.mkdirSyncRecursive(path.resolve(assetsPath, ".."));
  return Q
      .nfcall(fsCommons.access, assetsPath, fs.F_OK)
      .then(function () { wrench.rmdirSyncRecursive(assetsPath); }, _.noop)
      .then(function () { return Q.nfcall(fs.mkdir, assetsPath); })
      .then(function () { return downloadCommons.buffer(ARCHIVE); })
      .then(function (buf) {
        let zip = new AdmZip(buf);
        zip.extractAllTo(assetsPath, true);
      });
}

function downloadStaticFiles(assetsPath) {
  return downloadCommons.buffer(FILES_PREFIX + "LICENSE.md", true)
      .then(function (buf) {
        let content = buf.toString();
        let match = /(#### Emoji One Artwork[\s\S]*)####/mi.exec(content);
        return Q.nfcall(fs.writeFile, path.join(assetsPath, "LICENSE.md"), match == null ? content : match[1].trim());
      });
}

function updateDone() { updating = null; }
