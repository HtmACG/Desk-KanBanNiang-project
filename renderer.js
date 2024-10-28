document.addEventListener('DOMContentLoaded', function() {
    // 获取 model 路径并显示在输入框中
    var modelPaths = document.getElementById('modelPaths');
    modelPaths.value = modConfig.model.join('\n');
});

function openSourcePage() {
    window.open('https://github.com/HtmACG/live2D-project/', '_blank');
}

function open1SourcePage() {
    window.open('https://www.htmacg.cn/', '_blank');
}

function open3SourcePage() {
    window.open('https://mx.paul.ren/', '_blank');
}