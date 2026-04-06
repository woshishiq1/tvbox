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

// 寻找解压目录
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

// 查找 api.json
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
 * ⭐【修改核心】：顺着原版逻辑，极简替换
 */
function fixPaths(obj) {
  // 定义加速后的 GitHub 根目录地址 (注意分支是 main)
  const GITHUB_IY = "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/main/cpu_iy/";
  const GITHUB_IY2 = "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/main/cpu_iy2/";

  if (typeof obj === "string") {
    // 1. 替换直接写死的 Gitee iy 仓库地址 -> GitHub cpu_iy
    if (obj.includes("gitee.com/cpu-iy/iy/raw/master/")) {
      return obj.replace("https://gitee.com/cpu-iy/iy/raw/master/", GITHUB_IY);
    }
    
    // 2. 替换直接写死的 Gitee lib 仓库地址 -> GitHub cpu_iy2
    if (obj.includes("gitee.com/cpu-iy/lib/raw/master/")) {
      return obj.replace("https://gitee.com/cpu-iy/lib/raw/master/", GITHUB_IY2);
    }

    // 3. 替换本地相对路径 (照搬原版逻辑，但前缀换成 GitHub cpu_iy2 加速地址)
    // 这样 ./spider.jar 就会变成 https://ghfast.top/.../cpu_iy2/spider.jar
    if (obj.startsWith("./")) {
      return `${GITHUB_IY2}${obj.slice(2)}`;
    }
    if (obj.startsWith("../")) {
      return `${GITHUB_IY2}${obj.slice(3)}`;
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
  const root = findExtractedFolder();
  if (!root) {
    console.error("❌ 未找到解压后的文件夹（未检测到“缘起【天神IY】”）");
    process.exit(1);
  }
  console.log("📁 解压目录:", root);

  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json（已递归搜索所有子目录）");
    process.exit(1);
  }
  console.log("🔍 找到 api.json:", apiPath);

  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  const parsed = JSON.parse(raw);

  const fixed = fixPaths(parsed);

  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 成功生成 天神IY.txt");

} catch (e) {
  console.error("❌ 解析失败");
  console.error(e);
  process.exit(1);
}
