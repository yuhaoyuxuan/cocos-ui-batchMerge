# cocos-ui-batchMerge
自定义引擎，网页端（ts）和原生端（cpp）达到合批
cocos渲染ui组件时，在节点树中采用深度优先渲染，由此导致图文穿插时，产生大量的drawcall。
为了达到合批的效果，我们需要自定义渲染顺序，避免从上往下渲染产生大量的drawcall；
设置合批根节点为IsBatchRoot，节点下的所有子项
设置ui组件的depth，渲染时按depth值从小往大渲染(相同的depth同一批次提交数据)。
默认不使用自定义合批，对于需要使用自定义合批的界面，需要设置界面根节点为IsBatchRoot，这样根节点里面的ui元素才按depth排序渲染，实现默认mask节点为IsBatchRoot，因为mask会打断合批。
原文：https://forum.cocos.org/t/topic/158390

引擎修改
包含cocos-engine 3.5.2

