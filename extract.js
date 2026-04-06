const fs = require("fs");
const path = require("path");

/**
 * 1. 辅助函数：去除 JSON 中的注释和 BOM 头
 */
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return str;
}

function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

/**
 * 2. 自动识别解压后的文件夹
 */
function findExtractedFolder() {
  const EXPECTED = "缘起【天神IY】";
  if (fs.existsSync(EXPECTED) && fs.statSync(EXPECTED).isDirectory()) {
    return EXPECTED;
  }
  const dirs = fs.readdirSync(".").filter(d =>
    fs.statSync(d).isDirectory() && !d.startsWith(".") && d !== "node_modules"
  );
  return dirs.length === 1 ? dirs[0] : null;
}

/**
 * 3. 递归查找 api.json 文件
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
 * 4. 路径修复核心逻辑 (精准替换版)
 */
function fixPaths(obj) {
  // 定义两个不同的 GitHub 目标前缀
  const GITHUB_IY_TARGET = "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/master/cpu_iy/";
  const GITHUB_LIB_TARGET = "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/master/cpu_iy2/lib/";
  
  // 定义需要识别的 Gitee 原始前缀
  const GITEE_IY_PREFIX = "https://gitee.com/cpu-iy/iy/raw/master/";
  const GITEE_LIB_PREFIX_WITH_LIB = "https://gitee.com/cpu-iy/lib/raw/master/lib/";

  if (typeof obj === "string") {
    // A. 优先替换带 /lib/ 的长路径 (对应 cpu_iy2)
    if (obj.startsWith(GITEE_LIB_PREFIX_WITH_LIB)) {
      return obj.replace(GITEE_LIB_PREFIX_WITH_LIB, GITHUB_LIB_TARGET);
    }

    // B. 替换 IY 仓库路径 (对应 cpu_iy)
    if (obj.startsWith(GITEE_IY_PREFIX)) {
      return obj.replace(GITEE_IY_PREFIX, GITHUB_IY_TARGET);
    }

    // C. 处理相对路径 ./ (默认指向 IY 仓库根目录)
    if (obj.startsWith("./")) {
      return `${GITHUB_IY_TARGET}${obj.slice(2)}`;
    }

    // D. 处理相对路径 ../ (通常指代 lib 目录)
    if (obj.startsWith("../")) {
      // 如果原作者用 ../ 指向 lib，通常对应 cpu_iy2/lib/
      return `${GITHUB_LIB_TARGET}${obj.slice(3)}`;
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

/**
 * 5. 执行主流程
 */
try {
  console.log("🚀 开始精准路径替换...");

  const root = findExtractedFolder();
  if (!root) {
    console.error("❌ 未找到解压文件夹");
    process.exit(1);
  }

  const apiPath = findApiJson(root);
  if (!apiPath) {
    console.error("❌ 未找到 api.json");
    process.exit(1);
  }

  let raw = fs.readFileSync(apiPath, "utf8");
  raw = removeBOM(removeComments(raw));
  
  const parsed = JSON.parse(raw);
  const fixed = fixPaths(parsed);

  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  
  console.log("------------------------------------------");
  console.log("✅ 替换成功！已生成: 天神IY.txt");
  console.log("1. Gitee .../lib/lib/ -> GitHub .../cpu_iy2/lib/");
  console.log("2. Gitee .../iy/ -> GitHub .../cpu_iy/");
  console.log("------------------------------------------");

} catch (e) {
  console.error("❌ 运行异常:", e.message);
  process.exit(1);
}
