import {Vue, Component, Prop} from 'vue-property-decorator';
import * as api from '@/services/oneid';
import * as model from '@/models/oneid';
import Choose from '@/oneid-app/comps/choose/Choose';
import './EditManager.less';

@Component({
  components: {
    Choose,
  },
  template: html`
  <div class="ui-edit-manager-page">
    <div class="ui-edit-manager-page--body">
      <div class="ui-edit-manager-page--body-wrapper" v-if="form">
        <div class="manager-settings">
          <div class="manager-settings-users">
            <span class="ui-edit-manager-page--label">成员：</span>
            <div class="ui-edit-manager-page--content-side">
              <div
                class="node-user-list"
                @click="doStartChooseUser"
              >
                <span v-if="form.users.length === 0" class="placeholder">请选择用户</span>
                <span v-for="item in form.users" class="tag">{{ item.name }}</span>
              </div>
              <Choose
                v-if="chooseUser"
                v-bind="chooseUser"
                ref="chooseUser"
                @on-ok="onChooseUserOk"
              />
            </div>
          </div>
          <div class="manager-settings-scopes">
            <span class="ui-edit-manager-page--label">管理范围：</span>
            <div class="ui-edit-manager-page--content-side">
              <span class="ui-edit-manager-page--help">
                子管理员可以对五种分组类型（账号、部门、角色、标签、自定义分组类型）进行管理，每组子管理员至少要选择一种分组类型来管理
              </span>
              <RadioGroup vertical v-model="form.managerGroup.scopeSubject" class="radio-mode">
                  <Radio :label="1">所在分组及下级分组</Radio>
                  <Radio :label="2">特定账号及分组</Radio>
              </RadioGroup>
              <div
                v-if="form.managerGroup.scopeSubject === 2"
                class="node-user-list"
                @click="doStartChooseScope"
              >
                <span
                  v-if="form.managerGroup.nodes.length === 0 && form.managerGroup.users.length === 0"
                  class="placeholder"
                >
                  请选择特定账号及分组
                </span>
                <span v-for="item in form.managerGroup.nodes" class="tag">{{ item.name }}</span>
                <span v-for="item in form.managerGroup.users" class="tag">{{ item.name }}</span>
              </div>
              <Choose
                v-if="chooseScope"
                v-bind="chooseScope"
                ref="chooseScope"
                @on-ok="onChooseScopeOk"
              />
            </div>
          </div>
        </div>
        <div class="perm-settings">
          <span class="ui-edit-manager-page--label">分配权限：</span>
          <div class="ui-edit-manager-page--content-side">
            <div class="perm-settings-header">
              <span class="ui-edit-manager-page--help">将会在上面选择的子管理员名单范围内配置权限</span>
              <Checkbox v-model="isAllPerm" @on-change="onIsAllAppChange"><span>全选</span></Checkbox>
            </div>
            <div class="perm-settings-main">
              <div class="perm-settings-main-basic-list">
                <span class="title">基础权限：</span>
                <CheckboxGroup v-model="permIds" @on-change="doCheckPerm">
                  <ul v-if="basicPermOptions">
                    <li v-for="item in basicPermOptions" :key="item.id">
                      <div class="logo">
                        <img :src="item.logo ? $fileUrl(item.logo) : defaultLogo"/>
                      </div>
                      <span class="name">{{ item.name }}</span>
                      <Checkbox
                        :label="item.id"
                        class="checkbox"
                      />
                    </li>
                  </ul>
                </CheckboxGroup>
              </div>
              <div class="perm-settings-main-app-list">
                <span class="title">应用权限：</span>
                <CheckboxGroup v-model="appIds" @on-change="doCheckApp">
                  <ul v-if="appPermOptions">
                    <li v-for="item in appPermOptions" :key="item.uid">
                      <div class="logo">
                        <img :src="item.logo ? $fileUrl(item.logo) : defaultLogo"/>
                      </div>
                      <span class="name">{{ item.name }}</span>
                      <Checkbox
                        :label="item.uid"
                        class="checkbox"
                      />
                    </li>
                  </ul>
                </CheckboxGroup>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="ui-edit-manager-page--footer">
      <div class="ui-edit-manager-page--footer-wrapper">
        <Button type="error" @click="doRemove" :style="isNew ? 'visibility: hidden' : ''">删除</Button>
        <div class="flex-row">
          <Button type="default" @click="$router.back()">取消</Button>
          <Button type="primary" @click="doSave">保存并返回</Button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export default class EditManager extends Vue {
  basicPermOptions: {id: string, name: string}[] = [];
  appPermOptions: model.App[] = [];

  permIds: string[] = [];
  appIds: string[] = [];

  form: model.Node|null = null;
  isAllPerm = false;
  tmpPerms: {id: string, name: string}[] = [];
  tmpApps: model.App[] = [];
  managerUserIds: model.User[] = [];

  chooseUser: any = null;
  chooseScope: any = null;

  defaultLogo: string = require('../../../assets/icons/icon-applicationlist@2x.png');

  get isNew() {
    return this.$route.params.id === '0';
  }

  async loadData() {
    await this.loadOptions();
    await this.loadForm();
  }

  async loadOptions() {
    const {results: basicPermOptions} = await api.Config.retrieveMetaPermList();
    const {results: appPermOptions} = await api.App.list();

    this.basicPermOptions = basicPermOptions;
    this.appPermOptions = appPermOptions;
  }

  async loadForm() {
    const {id} = this.$route.params;
    if (!this.isNew) {
      const managerList = await api.Node.Manager.list();
      this.form = managerList.find(i => i.id === id);

      this.permIds = this.form!.managerGroup!.perms.map(i => i.id);
      this.appIds = this.form!.managerGroup!.apps.map(i => i.uid);
    } else {
      this.form = new model.Node();
    }
  }

  doStartChooseUser() {
    this.chooseUser = {
      title: '选择用户',
      onlyUser: true,
      multiple: true,
      checkedUserIds: this.form!.users.map(u => u.id),
    };
    this.$nextTick(() => this.$refs.chooseUser.show());
  }

  doStartChooseScope() {
    this.chooseScope = {
      title: '选择特定账号及分组',
      multiple: true,
      checkedIds: this.form!.managerGroup!.nodes.map(n => n.id),
      checkedUserIds: this.form!.managerGroup!.users.map(u => u.id),
    };
    this.$nextTick(() => this.$refs.chooseScope.show());
  }

  onChooseUserOk(nodes: model.Node[], users: model.User[]) {
    this.form!.users = users;
  }

  onChooseScopeOk(nodes: model.Node[], users: model.User[]) {
    this.form!.managerGroup!.nodes = nodes;
    this.form!.managerGroup!.users = users;
  }

  doCheckPerm() {
    this.form!.managerGroup!.perms = this.basicPermOptions
      .filter(i => this.permIds.includes(i.id));
  }
  doCheckApp() {
    this.form!.managerGroup!.apps = this.appPermOptions
      .filter(i => this.appIds.includes(i.uid));
  }

  async doSave() {
    const isValid = this.validateForm();
    if (!isValid) {
      return;
    }

    const form = this.form!;

    form.parent = null;
    const userIds = form.users.map(u => u.id);

    if (this.isNew) {
      const newManager = await api.Manager.create(form);
      await api.Node.Manager.updateUsers(newManager.id, {userIds});
    } else {
      await api.Node.Manager.partialUpdate(form);
      await api.Node.Manager.updateUsers(form.id, {userIds});
    }
    this.$router.back();
  }

  validateForm(): boolean {
    if (this.form!.users.length === 0) {
      this.$Message.error('请设置成员');
      return false;
    }
    if (!this.form!.managerGroup!.scopeSubject) {
      this.$Message.error('请设置管理范围');
      return false;
    }
    if (
      this.form!.managerGroup!.scopeSubject &&
      this.form!.managerGroup!.scopeSubject === 2 &&
      this.form!.users.length === 0
    ) {
      this.$Message.error('请设置管理范围');
      return false;
    }
    return true;
  }

  onIsAllAppChange(isAllPerm: boolean) {
    if (isAllPerm) {
      this.tmpApps = this.form!.managerGroup!.apps;
      this.tmpPerms = this.form!.managerGroup!.perms;

      this.form!.managerGroup!.apps = this.appPermOptions!;
      this.form!.managerGroup!.perms = this.basicPermOptions!;
      this.permIds = this.basicPermOptions.map(i => i.id);
      this.appIds = this.appPermOptions.map(i => i.uid);
    } else {
      this.form!.managerGroup!.apps = this.tmpApps;
      this.form!.managerGroup!.perms = this.tmpPerms;
      this.permIds = this.tmpPerms.map(i => i.id);
      this.appIds = this.tmpApps.map(i => i.uid);
    }
  }

  doRemove() {
    this.$Modal.confirm({
      render: () => '删除该子管理员配置',
      onOk: () => this.remove(),
    });
  }

  async remove() {
    const manager = this.form!;
    try {
      await api.Node.Manager.updateUsers(manager.id, {userIds: []});
      await api.Node.Manager.remove(manager.id);
      this.$Message.success('删除成功');
      this.$router.replace({name: 'admin.manager'});
    } catch (e) {
      this.$Message.error('删除失败');
    }
  }

  mounted() {
    this.loadData();
  }
}
