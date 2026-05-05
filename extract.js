const fs = require("fs");
const path = require("path");

// 去除注释和 BOM
function removeComments(str) {
  // 删除 /* ... */ 类型的注释
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  // 删除 // 类型的单行注释[cite: 1]
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return str;
}

function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

/**
 * 识别目录逻辑保持不变[cite: 1]
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
 * 递归查找 api.json[cite: 1]
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
 * ⭐【关键修改】：适配 GitHub 仓库路径
 * 逻辑：将所有以 /lib 开头的路径替换为最新的 GitHub 加速地址
 */
function fixPaths(obj) {
  const GITHUB_BASE = "https://ghfast.top/https://raw.githubusercontent.com/IY-CPU/IY/main";

  if (typeof obj === "string") {
    // 处理相对路径 ./ 或 ../ 的情况，统一转为 /lib 风格处理或直接拼接
    let cleanStr = obj;
    if (cleanStr.startsWith("./")) cleanStr = "/" + cleanStr.slice(2);
    if (cleanStr.startsWith("../")) cleanStr = "/" + cleanStr.slice(3);

    // 如果字符串是以 /lib 开头的，执行替换
    if (cleanStr.startsWith("/lib")) {
      return `${GITHUB_BASE}${cleanStr}`;
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

// 执行主逻辑
try {
  const root = findExtractedFolder();
  if (!root) {
    console.error("❌ 未找到解压后的文件夹");
    process.exit(1);
  }

  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json");
    process.exit(1);
  }

  console.log("🔍 正在处理文件:", apiPath);

  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw)); // 清理 Unicode 混淆[cite: 1]
  
  const parsed = JSON.parse(raw);

  // 调用新的路径修复逻辑[cite: 1]
  const fixed = fixPaths(parsed);

  // 输出到根目录
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功！已生成 GitHub 地址版的 天神IY.txt");

} catch (e) {
  console.error("❌ 处理失败，请检查 api.json 格式是否正确");
  console.error(e);
  process.exit(1);
}
