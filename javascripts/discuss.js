/// <reference path="jquery-2.1.0.js" />
/// <reference path="bootstrap.js" />
/// <reference path="../../ideref/TweenMax.js" />
/// <reference path="selectize.js" />
/*
 * Botzone 2.0 讨论版页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

var currPost = {}, panPosts, panSubPosts, subpostsShown, cmbTags, selectedTag;

//// Post表单逻辑 - 始

var confPostTagEdit = new FormConfig({
	method: "post",
	action: "/discuss/edittags",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			alert(result.message);
		} else {
			var html = GenerateTagsHTML(result.tags);
			panSubPosts.find(".tags").html(html);
			panPosts.find(".post-listitem.active .tags").html(html).data("value", result.tags);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		alert(__("generalerror") + errorThrown);
	}
});

var confPostCreate = new FormConfig({
	method: "post",
	action: "/discuss/create",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("create.success"), false);
			currPost = result.post;
			var template = panPosts.find(".post-listitem.template").clone(true).removeClass("template");
			template.data("id", result.post._id).prop("href", "#" + result.post._id);
			template.find(".list-group-item-heading").text(result.post.title);
			template.find(".post-listheading small").text(__("discuss.post.author", userMe.name));
			template.find("span.badge").text(0);
			template.find(".post-listinfo .content").text(result.post.content);
			template.find(".post-listinfo small").text(new Date(result.post.update_time).toString());
			template.find(".tags").html(GenerateTagsHTML(result.post.tags)).data("value", result.post.tags);
			panPosts.find(".list-group").prepend(template.show());

			window.location.hash = "#" + result.post._id;
			setTimeout(function () {
				$('#dlgCreatePost').modal('hide');
			}, 1000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confPostReply = new FormConfig({
	method: "post",
	action: "/discuss/reply",
	finalValidate: null,
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("reply.success"), false);
			var template = panSubPosts.find(".subpost-listitem:eq(0)").clone(true);
			template.find(".subpost-content").html(result.post.content);
			template.find(".subpost-info").html(
				Botzone.buildingBlocks.avatar(userMe._id) +
				__("discuss.subpost.author",
					Botzone.buildingBlocks.username(userMe),
					new Date(result.post.time).toString()
				)
			);
			template.find("a.aQuote").data("author-name", userMe.name).data("content", result.post.content);
			var parent = panPosts.find(".post-listitem.active");
			parent.prependTo(panPosts.find(".list-group"));
			parent.find(".post-listinfo small").text(new Date(result.post.time).toString());
			var parentbadge = parent.find("span.badge");
			parentbadge.text(parseInt(parentbadge.text()) + 1);
			panSubPosts.find(".list-group").append(template.show());
			$("#txtContent_reply").val("");
			setTimeout(function () { $(".alert").slideUp(); }, 2000);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

validateFunctions.checkPostTitle = function (title) {
	if (title == "" || title == null)
		return __("posttitle.nonnull");
	else if (title.length < Botzone.consts.post.title_length_min)
		return __("posttitle.tooshort");
	else if (title.length > Botzone.consts.post.title_length_max)
		return __("posttitle.toolong");
	return null;
};

validateFunctions.checkPostContent = function (content) {
	if (content == "" || content == null)
		return __("postcontent.nonnull");
	else if (content.length > Botzone.consts.post.content_length_max)
		return __("postcontent.toolong");
	return null;
};

//// Post表单逻辑 - 终

function ShowSubPosts(ctrl) {
	ctrl = $(ctrl);
	Botzone.$get("/discuss/detail/" + ctrl.data("id"), null, function (data) {
		$("body,html").animate({
			scrollTop: 0
		}, 100);

		currPost = data.post;
		$("#iParent, #iPostID").val(currPost._id);
		$(".post-listitem").removeClass("active");
		ctrl.addClass("active");
		var tags = ctrl.find(".tags");
		var tagarray = tags.data("value");
		if (typeof tagsarray === "string")
			tagsarray = JSON.parse(tagarray);
		if (!tagarray || !tagarray.length)
			tagarray = [];
		tagarray = tagarray.map(function (tag) { return tag.type + "-" + tag.targetid; });

		cmbTags[0].selectize.setValue(tagarray, false);

		panSubPosts.find(".panel-title").text(data.post.title).append(tags.clone());
		panSubPosts.find(".post-content").text(data.post.content);
		panSubPosts.find(".post-info").html(Botzone.buildingBlocks.avatar(data.post.author._id) +
			__("discuss.post.info", Botzone.buildingBlocks.username(data.post.author), new Date(data.post.time).toString()));
		if (!userMe || (!userMe.admin && data.post.author._id != userMe._id))
			$("#frmPostTagEdit").hide();
		else {
			$("#frmPostTagEdit").show();
			panSubPosts.find(".post-info").append(' | <a href="javascript:;" onclick="DeletePost()">' + __("discuss.post.delete") + '</a>');
		}
		panSubPosts.find(".subpost-listitem:gt(0)").remove();
		for (var i = 0; i < data.post.subposts.length; i++) {
			var template = panSubPosts.find(".subpost-listitem:eq(0)").clone(true);
			// 相信我，这里用HTML，上面不用，是有道理的
			// 后端保证回帖中小于号和大于号转义了
			// 这里是为了支持{{{}}}的引用语法
			template.find(".subpost-content").html(data.post.subposts[i].content);
			template.find("a.aQuote").data("author-name", data.post.subposts[i].author.name).data("content", data.post.subposts[i].content);
			template.find(".subpost-info").html(Botzone.buildingBlocks.avatar(data.post.subposts[i].author._id) +
				__("discuss.subpost.author", Botzone.buildingBlocks.username(data.post.subposts[i].author), new Date(data.post.subposts[i].time).toString()));
			panSubPosts.find(".list-group").append(template.show());
		}
		if (!subpostsShown) {
			panPosts.removeClass("col-md-12").addClass("col-md-4");
			panSubPosts.show();
			subpostsShown = true;
		}
	});
}

function Quote(ctrl) {
	ctrl = $(ctrl);
	$("#txtContent_reply").val("{{{" +
		ctrl.data("content").replace(/<div class=\"well well-sm\">/gm, "{{{").replace(/<\/div>/gm, "}}}") +
		"}}}\n" + __("discuss.replyto", ctrl.data("author-name"))).focus();
}

function HideSubPosts() {
	$(".post-listitem").removeClass("active");
	panPosts.removeClass("col-md-4").addClass("col-md-12");
	panSubPosts.hide();
	subpostsShown = false;
}

function GenerateTagsHTML(tags) {
	var html = "";
	for (var i = 0; i < tags.length; i++) {
		var tag = tags[i];
		if (!tag.targetid)
			continue;
		html += '<div class="post-tag tag-' + tag.type + '"><span class="type">' +
			__("tags." + tag.type) + '</span><span class="name">' + Botzone["id2" + tag.type][tag.targetid] + '</span></div>';
	}
	return html;
}

function DeletePost() {
	if (!confirm(__("discuss.post.delete.confirm")))
		return;
	Botzone.$post("/discuss/delete", { postid: currPost._id }, function (result) {
		panPosts.find(".post-listitem.active").remove();
		window.location.hash = "#";
	});
}

$(document).ready(function () {
	selectedTag = $(".filter").data("selectedtag");
	subpostsShown = false;
	panPosts = $("#panPosts");
	panSubPosts = $("#panSubPosts");
	cmbTags = $("#cmbTags");

	Botzone.defineHashChangedAction(function (to) {
		if (to.length > 1) {
			var $post = $("[href='" + to + "']");
			if ($post.length != 1) {
				// 淦，现在我只能去找这个帖子是第几页的了
				window.location.href = "/discuss/" + to.substr(1);
			} else
				ShowSubPosts($post[0]);
		} else
			HideSubPosts();
	});

	$(".tags").each(function () {
		var info = JSON.parse(this.textContent);
		this.style.display = "";
		if (!info || !Array.isArray(info)) {
			this.innerHTML = "";
			return;
		}
		this.dataset["value"] = this.textContent;
		this.innerHTML = GenerateTagsHTML(info);
	});

	var tagOptions = {
		plugins: ['optgroup_columns', 'remove_button', 'drag_drop'],
		options: _allGroups.concat(_allGames).concat(_allTags),
		optgroups: [
			{ id: "game", name: __("tags.game") },
			{ id: "group", name: __("tags.group") },
			{ id: "misc", name: __("tags.misc") }
		],
		labelField: 'name',
		valueField: 'id',
		optgroupField: 'type',
		optgroupLabelField: 'name',
		optgroupValueField: 'id',
		optgroupOrder: ['game', 'group', 'misc'],
		searchField: ['name'],
		maxItems: 5,
		persist: false,
		render: {
			item: function (item, escape) {
				return '<div class="post-tag tag-' + escape(item.type) + '"><span class="type">' +
					__("tags." + item.type) + '</span><span class="name">' + escape(item.name) + '</span></div>';
			}
		}
	};

	cmbTags.selectize(tagOptions);
	Botzone.onExit(function () {
		cmbTags[0].selectize.destroy();
	});
	var mapFun = function (g) {
		if (g.id == selectedTag)
			return '<li class="active"><a href="/discuss/' + g.id + '">' + g.name + '</a></li>';
		else
			return '<li><a href="/discuss/' + g.id + '">' + g.name + '</a></li>';
	};
	$(".filter .dropdown.group .dropdown-menu").append(_allGroups.map(mapFun).join(''));
	$(".filter .dropdown.game .dropdown-menu").append(_allGames.map(mapFun).join(''));
	$(".filter .dropdown.misc .dropdown-menu").append(_allTags.map(mapFun).join(''));
	var selected = $(".filter .dropdown li.active");
	selected.closest(".dropdown").find(".selected-name").text(selected.text());
	$("#iTag_post").val(selectedTag);
});
