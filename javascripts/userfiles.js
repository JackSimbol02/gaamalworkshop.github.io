/*
 * Botzone 2.0 用户数据管理页面控制脚本
 * 作者：zhouhy
 * 需求：jQuery、Botzone2.0的global脚本框架
 */

function UpdateSize(delta) {
	var $cur = $("#lblFolderSize"),
		$max = $("#lblMaxSize"),
		$prgbar = $("#prgbarUsed");
	var newSize, oldSize = parseInt($cur.text());
	if (isNaN(delta) || isNaN(oldSize)) {
		$cur.text("?");
		Botzone.replacePage(location.href);
	} else {
		$cur.text(newSize = oldSize + delta);
		$prgbar.css("width", newSize * 100 / parseInt($max.text()) + "%");
	}
}

//// 上传表单逻辑 - 始

var confUploadFile = new FormConfig({
	method: "post",
	ajaxFile: true,
	action: "/userfile/uploadfile",
	onResult: function (result, size) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("create.success"), false);
			Botzone.replacePage(location.href);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confNewFolder = new FormConfig({
	method: "post",
	action: "/userfile/newfolder",
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("create.success"), false);
			Botzone.replacePage(location.href);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

var confUploadZip = new FormConfig({
	method: "post",
	ajaxFile: true,
	action: "/userfile/uploadzip",
	onResult: function (result) {
		if (result.success == false) {
			this.setFormResponse(result.message, true);
		} else {
			this.setFormResponse(__("create.success"), false);
			Botzone.replacePage(location.href);
		}
	},
	onError: function (jqXHR, textStatus, errorThrown) {
		this.setFormResponse(__("generalerror") + errorThrown, true);
	}
});

//// 上传表单逻辑 - 终

function Delete(ctrl) {
	if (!confirm(__("userfiles.delete.confirm")))
		return;
	Botzone.$post("/userfile/delete" + $(ctrl).data("filename"), null, function (data) {
		var $tr = $(ctrl).closest("tr");
		var sz = $tr.data("size");
		$tr.remove();
		if (typeof sz != 'number')
			sz = parseInt(sz);
		UpdateSize(-sz);
	});
}

function UpdateName(ctrl) {
	$("#txtFilename").val(ctrl.value.split(/[\\/]/).pop());
}

$(document).ready(function () {
	function BuildResumable($form, conf) {
		conf.r = new Resumable({
			target: conf.action,
			simultaneousUploads: 1,
			chunkSize: 1024 * 1024,
			fileParameterName: "file",
			testChunks: true,
			maxFiles: 1
		});
	
		// 如果浏览器支持，那么要改成分段上传，以便处理大文件
		if (!conf.r.support)
			return;

		var accept = $form.find('input[type=file]').remove().attr("accept");
		var $uploadbtn = $form.find(".btn.upload").show();
		var $filename = $form.find("#txtFilename");
		conf.r.assignBrowse($uploadbtn);
		$form.find("input[type=file]").attr("accept", accept);
		var $prgbar = $form.find(".progress-bar");
		var $btn = $form.find("button[type=submit]");
		conf.r.on("fileAdded", function (file) {
			$uploadbtn.addClass("active").data("oldname", $uploadbtn.text()).text(file.fileName);
			$filename.val(file.fileName);
		});
		conf.r.on('progress', function () {
			$prgbar
				.css("width", conf.r.progress() * 100 + "%")
				.text((conf.r.progress() * 100).toFixed(1) + "%");
		});
		conf.r.on('fileSuccess', function (file, message) {
			$btn.prop("disabled", false);
			conf.onResult(JSON.parse(message), file.size);
			conf.r.cancel();
			$uploadbtn.removeClass("active").text($uploadbtn.data("oldname"));
		});
		conf.r.on('fileError', function (file, message) {
			$btn.prop("disabled", false);
			conf.onError(null, null, message || __("maybetoolarge"));
			conf.r.cancel();
			$uploadbtn.removeClass("active").text($uploadbtn.data("oldname"));
			$filename.val("");
		});
		conf.externalSubmitMethod = function ($form, data) {
			if (conf.r.files.length == 0)
				return true;
			delete data.file;

			$btn.prop("disabled", true);
			this.r.opts.query = data;
	
			this.r.upload();

			return true;
		};
		Botzone.onExit(function () {
			conf.r.cancel();
		});
	}
	BuildResumable($('#frmUploadFile'), confUploadFile);
	BuildResumable($('#frmUploadZip'), confUploadZip);
});