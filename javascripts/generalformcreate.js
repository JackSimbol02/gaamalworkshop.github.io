/*
 * Botzone 2.0 通用表单创建 / 修改页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

//// 创建 / 修改表单逻辑 - 始

var frmCreateOrModifyGeneralform = new FormConfig({
	method: "post",
	action: "/generalforms/create",
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			Botzone.replacePage("/generalform/" + result.name);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkGeneralFormSettings = function () {
	var root = document.getElementById('dSettings');
	var result = {};
	Botzone.recursiveAggregateProp(root, result);
	$('#iSettings').val(JSON.stringify(result));
};

validateFunctions.checkGeneralFormName = function (name) {
	if (name == "" || name == null)
		return __("name.nonnull");
	else if (name.length > Botzone.consts.generalform.name_length)
		return __("name.toolong");
	else if (!/^[_A-Za-z0-9]+$/.test(name))
		return __("name.invalidchar");
	return null;
};

validateFunctions.checkGeneralFormTitle = function (title) {
	if (title == "" || title == null)
		return __("title.nonnull");
	else if (title.length > Botzone.consts.generalform.title_length)
		return __("title.toolong");
	return null;
};

validateFunctions.checkGeneralFormTime = function (time) {
	if (time == "" || time == null)
		return __("generalformtime.nonnull");
	time = new Date(time);
	if (time == "" || time == null)
		return __("generalformtime.invalid");
	else if (time < Date.now())
		return confirm(__("generalformtime.inthepast.prompt")) ? null : __("generalformtime.inthepast");
	return null;
};

validateFunctions.checkGeneralFormDesc = function (desc) {
	if (desc == "" || desc == null)
		return __("desc.nonnull");
	else if (desc.length > Botzone.consts.generalform.desc_length)
		return __("desc.toolong");
	return null;
};

//// 创建 / 修改表单逻辑 - 终

$(document).ready(function () {
	$("#txtEndTime").datetimepicker();
});