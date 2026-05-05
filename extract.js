const fs = require("fs");
const path = require("path");

// 1. 去除混淆注释和 BOM
function removeComments(str) {
  str = str.replace(/\/\*[\s\S]*?\*\//g, "");
  str = str.replace(/(^|[^:])\/\/.*$/gm, "$1");
  return str;
}

function removeBOM(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// 2. 识别目录逻辑
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

// 3. 递归查找 api.json
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
 * 4. ⭐ 全局路径强制修复逻辑
 * 规则：
 * - 强制写死 spider 字段
 * - 只要包含 /main/，就切除前半部分并替换
 * - 处理本地相对路径 ./ 或 /lib
 */
function fixPaths(obj) {
  const CORRECT_BASE = "https://ghfast.top/https://raw.githubusercontent.com/IY-CPU/IY/main";

  if (typeof obj === "string") {
    let val = obj;

    // A. 如果包含 /main/，说明是一个需要修复的 URL[cite: 1]
    if (val.includes("/main/")) {
      const parts = val.split("/main/");
      // 取出 /main/ 之后的部分并拼接正确的前缀[cite: 1]
      return `${CORRECT_BASE}/${parts[1]}`;
    }

    // B. 处理本地相对路径或以 /lib 开头的路径[cite: 1]
    if (val.startsWith("./") || val.startsWith("../") || val.startsWith("/lib")) {
      let suffix = val;
      if (suffix.startsWith("./")) suffix = suffix.slice(2);
      if (suffix.startsWith("../")) suffix = suffix.slice(3);
      if (suffix.startsWith("/")) suffix = suffix.slice(1);
      return `${CORRECT_BASE}/${suffix}`;
    }

    return val;
  }

  if (Array.isArray(obj)) {
    return obj.map(fixPaths);
  }

  if (typeof obj === "object" && obj !== null) {
    // 强制指定 spider 字段[cite: 1]
    if (obj.hasOwnProperty("spider")) {
      obj["spider"] = `${CORRECT_BASE}/spider.jar`;
    }

    for (let key in obj) {
      // spider 已经在上面特殊处理过了，这里跳过
      if (key !== "spider") {
        obj[key] = fixPaths(obj[key]);
      }
    }
    return obj;
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
  raw = removeBOM(removeComments(raw)); // 去掉古文干扰[cite: 1]
  
  const parsed = JSON.parse(raw);

  // 调用路径修复逻辑[cite: 1]
  const fixed = fixPaths(parsed);

  // 输出结果到根目录
  fs.writeFileSync("天神IY.txt", JSON.stringify(fixed, null, 2), "utf8");
  console.log("✅ 转换成功！所有乱七八糟的 /main/ 地址已统一为 IY/main 加速版");

} catch (e) {
  console.error("❌ 处理失败，请检查 api.json 格式");
  console.error(e);
  process.exit(1);
}
