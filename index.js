import custom_table from "/asciidoc-table-plugin/plugin.js";

const md = window.markdownit({ html: true });
md.block.ruler.before('table', "custom_table", custom_table);

document.querySelectorAll(".input").forEach((input)=>{
    let div = document.createElement("div");
    div.classList.add("container");
    let res = document.createElement("div");
    res.innerHTML = md.render(input.innerText);
    
    input.after(div);
    div.appendChild(input);
    div.appendChild(res);
});