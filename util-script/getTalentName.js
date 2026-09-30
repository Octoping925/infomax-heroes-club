// https://www.icy-veins.com/heroes/talent-calculator/xalatath?r=------

let arr = [];
document.querySelectorAll(".talent-buttons > img").forEach((el) => {
    const src = el.getAttribute("src").split("/").pop();
    const alt = el.getAttribute("alt");
    const name = alt.split(" Icon").replaceAll(" ", "");
    arr.push({ u: src, n: name });
});