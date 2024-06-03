const {
  script,
  domReady,
  input,
  div,
  text_attr,
  canvas,
  button,
} = require("@saltcorn/markup/tags");
const File = require("@saltcorn/data/models/file");
const db = require("@saltcorn/data/db");
const path = require("path");
const fs = require("fs");

const ImageEditor = {
  type: "HTML",
  isEdit: true,
  blockDisplay: true,
  handlesTextStyle: true,
  setsDataURL: {
    get_filename: ({ id }) => (id ? `signature${id}.png` : "signature.png"),
    get_folder: ({ folder }) => folder,
  },
  configFields: async () => {
    const dirs = await File.allDirectories();
    return [
      {
        name: "folder",
        label: "Folder",
        type: "String",
        attributes: { options: dirs.map((d) => d.path_to_serve) },
      },
    ];
  },
  run: (nm, file_name, attrs, cls, reqd, field) => {
    let existing = null; 
    if (file_name)
      try {
        const tenant = db.getTenantSchema();
        const safeFile = File.normalise(file_name);
        const absPath = path.join(db.connectObj.file_store, tenant, safeFile);
        const contents = fs.readFileSync(absPath);
        const b64 = contents.toString("base64");
        existing = `data:image/png;base64,${b64}`;
        
      } catch (e) {
        console.error("signature-pad existing error", e);
      }
  

    return div(
      { id: `signature-pad-${nm}` },
      canvas({ class: "border" }),
      input({
        type: "hidden",
        "data-fieldname": field.form_name,
        name: text_attr(nm),
        id: `input${text_attr(nm)}`,
        value: file_name || false,
      }),
      button(
        {
          class: "btn btn-sm btn-secondary d-block",
          type: "button",
          onClick: `window.theSignaturePad_${nm}.clear();$('#input${text_attr(
            nm
          )}').val('');$('#input${text_attr(
            nm
          )}').closest('form').trigger('change');`,
        },
        "Clear"
      ),
      button(
        {
          class: "btn btn-sm btn-secondary d-block mt-3",
          type: "button",
          id: `edit_image_${nm}`,      
        },
        "Edit"
      ),
      script(
        domReady(`
        const canvas = document.querySelector("div#signature-pad-${nm} canvas");
        window.theSignaturePad_${nm} = new SignaturePad(canvas);
        ${
          existing
            ? `window.theSignaturePad_${nm}.fromDataURL("${existing}");`
            : ""
        }
        const form = $("div#signature-pad-${nm}").closest("form");
        const isNode = typeof parent.saltcorn === "undefined";
        window.theSignaturePad_${nm}.addEventListener("endStroke", () => {
          $("#input${text_attr(nm)}").val(window.theSignaturePad_${nm}.toDataURL());
          form.trigger("change");
        });
        if (!isNode) form.attr('onsubmit', 'javascript:void(0)');
        form.submit(() => {
          $("#input${text_attr(nm)}").val(window.theSignaturePad_${nm}.toDataURL());
          if (!isNode) {
            const locTokens = parent.currentLocation().split("/");
            formSubmit(form[0], '/view/', locTokens[locTokens.length - 1], true);
          }
        });
        document.getElementById("edit_image_${nm}").addEventListener('click', () => {  
          const ImageEditor = new FilerobotImageEditor(); 
          ImageEditor.open("http://localhost:3000/files/serve/${file_name}")
        });
      `)
      )
    );
  },
};

const dependencies = ["@saltcorn/html"];
module.exports = {
  headers: [
    {
        script: `/plugins/public/saltcorn-fileview-editor${
          "@" + require("./package.json").version
        }/filerobot-image-editor.min.js`,
    },
    {
        script: `/plugins/public/saltcorn-fileview-editor${
          "@" + require("./package.json").version
        }/signature_pad.umd.min.js`, 
    },
    // {
    //   script: "/files/serve/public/filerobot-image-editor.min.js",
    // },
    // {
    //   script: `/files/serve/public/signature_pad.umd.min.js`,
    // },
    
  ],
  sc_plugin_api_version: 1,
  fileviews: { ImageEditor },
  plugin_name: "saltcorn-fileview-editor",
  dependencies,
};
