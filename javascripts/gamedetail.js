/*
 * Botzone 2.0 游戏列表页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery
 */

//// 创建游戏表单逻辑 - 始

var confCreateGame = new FormConfig({
	method: "post",
	action: "/game/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("success"), false);
			setTimeout(function () {
				Botzone.replacePage(location.href);
			}, 3000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkGameName = function (name) {
	if (name == "" || name == null)
		return __("gamename.nonnull");
	else if (name.length > Botzone.consts.game.name_length)
		return __("gamename.toolong");
	return null;
};

validateFunctions.checkGameDesc = function (desc) {
	if (desc == "" || desc == null)
		return __("gamedesc.nonnull");
	else if (desc.length > Botzone.consts.game.desc_length)
		return __("gamedesc.toolong");
	return null;
};

validateFunctions.checkGamePlayerNum = function (num) {
	if (num == "" || num == null)
		return __("gameplayernum.nonnull");
	else if (!parseInt(num))
		return __("gameplayernum.mustbenumber");
	else if (parseInt(num) > Botzone.consts.game.player_num_limit)
		return __("gameplayernum.toolarge");
	return null;
};

//// 创建游戏表单逻辑 - 终

$(document).ready(function () {
	var a = window.location.href.split('#');
	if (a.length > 1 && a[a.length - 1])
		window.location.href = "/game/" + a[a.length - 1];

	// 改造成自动完成组合框
	$("#cmbUserName_game").selectize({
		options: _allUsers,
		items: ['{{ id }}'],
		labelField: 'name',
		valueField: '_id',
		searchField: ['name']
	});
});