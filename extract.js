const fs = require("fs");
const path = require("path");

/**
 * 1. 基础预处理：清除干扰字符
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
 * 2. 自动定位解压文件夹
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
 * 3. 递归寻找 api.json
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
 * 4. 【核心逻辑】仓库精准映射转换
 */
function fixPaths(obj) {
  // 定义仓库映射表
  const REPO_MAP = {
    // Gitee 仓库标识 : GitHub 对应目录
    "cpu-iy/iy": "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/master/cpu_iy/",
    "cpu-iy/lib": "https://ghfast.top/https://raw.githubusercontent.com/woshishiq1/hipy-drpy/master/cpu_iy2/"
  };

  if (typeof obj === "string") {
    // 遍历映射表
    for (const [giteeRepo, githubPrefix] of Object.entries(REPO_MAP)) {
      const giteeFullPrefix = `https://gitee.com/${giteeRepo}/raw/master/`;
      
      if (obj.startsWith(giteeFullPrefix)) {
        // 只替换仓库前缀，保留后面所有的子路径（如 /lib/藤藤.png 或 /lib/drpy2.min.js）
        // 这样即便两个仓库都有 lib 文件夹，也会被准确分流到对应的 cpu_iy 或 cpu_iy2
        return obj.replace(giteeFullPrefix, githubPrefix);
      }
    }

    // 处理特殊的 spider.jar 强制定位 (如果它不在 gitee 链接里)
    if (obj.includes("spider.jar") && !obj.includes("https")) {
      return `${REPO_MAP["cpu-iy/lib"]}spider.jar`;
    }
    
    return obj;
  }
  
  if (Array.isArray(obj)) return obj.map(fixPaths);
  if (typeof obj === "object" && obj !== null) {
    const res = {};
    for (const [k, v] of Object.entries(obj)) res[k] = fixPaths(v);
    return res;
  }
  return obj;
}

/**
 * 5. 主程序运行
 */
async function run() {
  try {
    const root = findExtractedFolder();
    if (!root) {
      console.error("❌ 未找到解压文件夹，请确认解压后的目录在当前 JS 旁边。");
      return;
    }

    const apiPath = findApiJson(root);
    if (!apiPath) {
      console.error("❌ 在文件夹中找不到 api.json。");
      return;
    }

    console.log(`📂 读取配置: ${apiPath}`);
    let raw = fs.readFileSync(apiPath, "utf8");
    raw = removeBOM(removeComments(raw));
    
    let parsed = JSON.parse(raw);
    const fixed = fixPaths(parsed);

    // 写入新配置
    const outputPath = "天神IY_GitHub最终版.txt";
    fs.writeFileSync(outputPath, JSON.stringify(fixed, null, 2), "utf8");
    
    console.log("------------------------------------------");
    console.log("✅ 转换成功！不再混淆不同仓库的 lib 文件夹。");
    console.log(`📝 已保存: ${outputPath}`);
    console.log("------------------------------------------");

  } catch (error) {
    console.error("❌ 运行出错:", error.message);
  }
}

run();
