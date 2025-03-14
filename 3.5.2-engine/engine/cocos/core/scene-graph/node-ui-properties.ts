/*
 Copyright (c) 2017-2020 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import { Renderable2D } from '../../2d/framework/renderable-2d';
import { UITransform } from '../../2d/framework/ui-transform';
import { warnID } from '../platform/debug';
import { UIMeshRenderer , UIOpacity} from '../../2d';

/**
 * @en Node's UI properties abstraction
 * @zh 节点上 UI 相关的属性抽象类
 */
export class NodeUIProperties {
    /**
     * @en The UI transform component
     * @zh UI 变换组件
     */
    get uiTransformComp () {
        if (!this._uiTransformComp) {
            this._uiTransformComp = this._node.getComponent('cc.UITransform') as UITransform;
        }

        return this._uiTransformComp;
    }
    set uiTransformComp (value: UITransform | null) {
        this._uiTransformComp = value;
    }

    /**
     * @en The base UI component
     * @zh UI 基类组件
     */
    get uiComp () {
        return this._uiComp;
    }
    set uiComp (comp: UIMeshRenderer | Renderable2D | null) {
        if (this._uiComp && comp) {
            warnID(12002);
            return;
        }
        this._uiComp = comp;
    }

    private _uiComp: UIMeshRenderer | Renderable2D | null = null;

    /**
     * @en The opacity of the UI node for final rendering
     * @zh 最终显示的 UI 透明度，受父节点透明度影响
     */
    private _opacity = 1;
    public get opacity () { return this._opacity; }

    /**
     * @en The opacity of the UI node itself
     * @zh 本节点的 UI 透明度
     */
    private _localOpacity = 1;
    get localOpacity () { return this._localOpacity; }
    set localOpacity (val) {
        this._localOpacity = val;
        this.colorDirty = true;
    }

    public colorDirty = true;
    protected _uiTransformComp: UITransform | null = null;
    private _node: any;

    constructor (node: any) {
        this._node = node;
    }

    /**
     * @deprecated since v3.4
     */
    public applyOpacity (effectOpacity) {
        this._opacity = this._localOpacity * effectOpacity;
    }

    /**
     * @en Make the opacity state of node tree is dirty, not effect anymore
     * @zh 为结点树的透明度状态设置脏标签，不再有效果
     * @deprecated since v3.4
     */
    public static markOpacityTree (node, isDirty = true) {}

    
    protected _uiOpacityComp: UIOpacity | null = null;
    /**
     * UIOpacity组件
     */
    get uiOpacityComp(): UIOpacity | null {
        if(!this._uiOpacityComp) {
            this._uiOpacityComp = this._node.getComponent('cc.UIOpacity')
        }
        return this._uiOpacityComp
    }
}
