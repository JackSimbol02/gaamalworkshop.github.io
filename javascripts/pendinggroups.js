/*
 * Botzone 2.0 待验证小组一览页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

//// 通过小组申请表单逻辑 - 始

var confAcceptGroup = new FormConfig({
    method: "post",
    action: "/groups/pending/accept",
    finalValidate: null,
    onResult: function (result) {
        if (result.success == false) {
            this.setFormResponse(result.message, true);
        } else {
            this.setFormResponse(__("success"), false);
            setTimeout(function () {
				Botzone.replacePage(location.href);
            }, 2000);
        }
    },
    onError: function (jqXHR, textStatus, errorThrown) {
        this.setFormResponse(__("generalerror") + errorThrown, true);
    }
});

//// 通过小组申请表单逻辑 - 终

function ConfirmGroup(id) {
    var dlg = $("#dlgConfirmGroup").modal("show");
    var group = groups[id];
    dlg.find("#iGroupID").val(id);
    dlg.find("#txtName_group").text(group.name);
    dlg.find("#txtDesc_group").text(group.desc);
    dlg.find("#txtReason_group").text(group.reason);
}