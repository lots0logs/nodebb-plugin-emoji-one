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

const ARCHIVE = "https://d1j8pt39hxlh3d.cloudfront.net/emoji/emojione/3.0/EmojiOne_3.0_32x32_png.zip";
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
  let tmpPath = path.join(assetsPath, "..", "." + path.basename(assetsPath));
  return Q.nfcall(fsCommons.access, tmpPath, fs.F_OK)
      .then(function () { wrench.rmdirSyncRecursive(tmpPath); }, _.noop)
      .then(function () { return downloadCommons.buffer(ARCHIVE, true); })
      .then(function (buf) {
        let zip = new AdmZip(buf);
        zip.extractAllTo(tmpPath, true);
        return Q
            .nfcall(fsCommons.access, assetsPath, fs.F_OK)
            .then(function () { wrench.rmdirSyncRecursive(assetsPath); }, _.noop)
            .then(function () { return Q.nfcall(fs.rename, tmpPath, assetsPath); });
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
