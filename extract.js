const fs = require("fs");
const path = require("path");

// 去除注释和 BOM
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return str;
}
function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

/**
 * 优先识别 ZIP 解压后的固定目录 “缘起【天神IY】”
 */
function findExtractedFolder() {
  const EXPECTED = "缘起【天神IY】";

  if (fs.existsSync(EXPECTED) && fs.statSync(EXPECTED).isDirectory()) {
    return EXPECTED;
  }

  const dirs = fs.readdirSync(".").filter(d =>
    fs.statSync(d).isDirectory() && !d.startsWith(".")
  );

  if (dirs.length === 1) {
    return dirs[0];
  }

  return null;
}

/**
 * 递归查找 api.json
 */
function findApiJson(dir) {
  const entries = fs.readdirSync(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      const found = findApiJson(full);
      if (found) return found;
    } else if (e === "api.json") {
      return full;
    }
  }
  return null;
}

/**
 * 修复相对路径
 * ⭐【修改处】：将原来的 Gitee 链接替换为新的 GitHub 镜像链接
 */
function fixPaths(obj) {
  // 定义新的前缀
  const NEW_PREFIX = "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/master/cpu_iy/";

  if (typeof obj === "string") {
    if (obj.startsWith("./")) {
      // 移除 ./ 并拼接新前缀
      return `${NEW_PREFIX}${obj.slice(2)}`;
    }
    if (obj.startsWith("../")) {
      // 移除 ../ 并拼接新前缀
      return `${NEW_PREFIX}${obj.slice(3)}`;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(fixPaths);
  }
  
  if (typeof obj === "object" && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = fixPaths(v);
    }
    return res;
  }
  return obj;
}

try {
  // 1) 自动识别解压文件夹
  const root = findExtractedFolder();
  if (!root) {
    console.error("❌ 未找到解压后的文件夹（未检测到“缘起【天神IY】”）");
    process.exit(1);
  }
  console.log("📁 解压目录:", root);

  // 2) 查找 api.json
  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json（已递归搜索所有子目录）");
    process.exit(1);
  }
  console.log("🔍 找到 api.json:", apiPath);

  // 3) 去除注释和 BOM
  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  const parsed = JSON.parse(raw);

  // 4) 修复路径
  const fixed = fixPaths(parsed);

  // 5) 输出
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");
  console.log("🔗 已将链接前缀替换为 GitHub 镜像地址");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
