/*
 * Botzone 2.0 小组一览页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

//// 申请创建小组表单逻辑 - 始

var confCreateGroup = new FormConfig({
    method: "post",
    action: "/group/create",
    finalValidate: null,
    onResult: function (result) {
        if (result.success == false) {
            this.setFormResponse(result.message, true);
        } else {
            this.setFormResponse(__("success"), false);
            setTimeout(function () {
                $('#dlgCreateGroup').modal('hide');
            }, 5000);
        }
    },
    onError: function (jqXHR, textStatus, errorThrown) {
        this.setFormResponse(__("generalerror") + errorThrown, true);
    }
});

validateFunctions.checkGroupName = function (name) {
    if (name == "" || name == null)
        return __("groupname.nonnull");
    else if (name.length < Botzone.consts.group.name_length_min)
        return __("groupname.tooshort");
    else if (name.length > Botzone.consts.group.name_length_max)
        return __("groupname.toolong");
    return null;
};

validateFunctions.checkGroupDesc = function (desc) {
    if (desc == "" || desc == null)
        return __("groupdesc.nonnull");
    else if (desc.length > Botzone.consts.group.desc_length_max)
        return __("groupdesc.toolong");
    return null;
};

validateFunctions.checkGroupReason = function (reason) {
    if (reason == "" || reason == null)
        return __("groupreason.nonnull");
    else if (reason.length > Botzone.consts.group.reason_length_max)
        return __("groupreason.toolong");
    return null;
};

//// 申请创建小组表单逻辑 - 终