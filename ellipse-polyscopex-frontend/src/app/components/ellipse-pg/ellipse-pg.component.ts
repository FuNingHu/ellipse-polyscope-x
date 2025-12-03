import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Acceleration, AccelerationUnits, AddNode, Angle, AngleUnits, InsertionEnum, Length, LengthUnits, MoveScreenOptions, MoveToBlendSettings, MoveToNode, MoveToSpeedSettings, MoveToTransformSettings, NodeType, ProgramPresenter, ProgramPresenterAPI, RemoveNode, RobotSettings, Speed, SpeedUnits, TabInputModel, URVariable, Value, VariableValueType, Waypoint, WaypointTabInputModel } from '@universal-robots/contribution-api';
import { ANGULAR_STEP_DISTANCE, EllipsePgNode, HORIZONTAL_RADIUS_IN_M, NUMBER_OF_WAYPOINTS, SHARED_BLEND_RADIUS_IN_M, SHARED_TOOL_ACCELERATION_IN_M_S2, SHARED_TOOL_SPEED_IN_M_S, VERTICAL_RADIUS_IN_M } from './ellipse-pg.node';
import { first } from 'rxjs/operators';
import { SelectedInput } from '@universal-robots/ui-models';

@Component({
    templateUrl: './ellipse-pg.component.html',
    styleUrls: ['./ellipse-pg.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})

export class EllipsePgComponent implements OnChanges, ProgramPresenter {
    // presenterAPI is optional
    @Input() presenterAPI: ProgramPresenterAPI;

    // robotSettings is optional
    @Input() robotSettings: RobotSettings;
    // contributedNode is optional
    @Input() contributedNode: EllipsePgNode;

    constructor(
        protected readonly translateService: TranslateService,
        protected readonly cd: ChangeDetectorRef
    ) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes?.robotSettings) {
            if (!changes?.robotSettings?.currentValue) {
                return;
            }

            if (changes?.robotSettings?.isFirstChange()) {
                if (changes?.robotSettings?.currentValue) {
                    this.translateService.use(changes?.robotSettings?.currentValue?.language);
                }
                this.translateService.setDefaultLang('en');
            }

            this.translateService
                .use(changes?.robotSettings?.currentValue?.language)
                .pipe(first())
                .subscribe(() => {
                    this.cd.detectChanges();
                });
        }

        if(changes?.presenterAPI && this.presenterAPI){
            console.log(`[ngOnChanges] Current node waypoint value: Orientation:: ${this.contributedNode.parameters.waypoint.pose.orientation}`);
            console.log(`[ngOnChanges] Position:: ${this.contributedNode.parameters.waypoint.pose.position}`);
        }
        
        if(changes?.contributedNode && this.contributedNode){
            console.log(`[ngOnChanges] ContributedNode changed. Waypoint value: Orientation:: ${this.contributedNode.parameters.waypoint.pose.orientation}`);
            console.log(`[ngOnChanges] Position:: ${this.contributedNode.parameters.waypoint.pose.position}`);
        }
    }
    async onEditButtonClick() {
        console.log('Edit center button clicked!');
        const options: MoveScreenOptions = {
            moveScreenTarget: 'waypoint',
            moveScreenTargetLabel: 'center pose',
        };
        const waypoint = await this.presenterAPI.robotMoveService.openMoveScreen(options);
        const treeservice = this.presenterAPI.programTreeService;
        const builder = this.presenterAPI.builder;

        console.log('Waypoint returned from openMoveScreen:', waypoint);
        if(waypoint) {
            console.log('Waypoint position:', waypoint.pose.position);
            console.log('Waypoint orientation:', waypoint.pose.orientation);
        }

        // Check if waypoint is valid
        // If waypoint exists and position is not all zeros (may be default value returned when user cancels)
        const isValidWaypoint = waypoint !== undefined && waypoint !== null &&
            (waypoint.pose.position[0] !== 0 || 
             waypoint.pose.position[1] !== 0 || 
             waypoint.pose.position[2] !== 0);

        if(isValidWaypoint){
            console.log('Valid waypoint received, processing...');
            
            // Delete all existing child nodes first
            await this.deleteAllChildNodes();
            
            // Save waypoint in local variable to avoid being reset when adding nodes
            const savedWaypoint = waypoint;
            
            // Set waypoint and save immediately to avoid being reset when adding nodes
            this.contributedNode.parameters.waypoint = savedWaypoint;
            console.log('Waypoint set to contributedNode. Saving node...');
            await this.saveNode();
            console.log('Node saved. Current waypoint value:');
            console.log(`Orientation:: ${this.contributedNode.parameters.waypoint.pose.orientation}`);
            console.log(`Position:: ${this.contributedNode.parameters.waypoint.pose.position}`);
            
            // Create and add child nodes after saving, using local variable to ensure correct waypoint is used
            const baseAngle = savedWaypoint.qNear.base + Math.PI/2;
            const xContribution = Math.cos(baseAngle);
            const yContribution = Math.sin(baseAngle);
            let angle = -Math.PI;
            const pivotNodeId = this.presenterAPI.selectedNodeId;

            for(let i=0; i<NUMBER_OF_WAYPOINTS; i++){
                angle += ANGULAR_STEP_DISTANCE;
                let offsetX = Math.cos(angle) * HORIZONTAL_RADIUS_IN_M * xContribution;
                let offsetY = Math.cos(angle) * HORIZONTAL_RADIUS_IN_M * yContribution;
                let offsetZ = Math.sin(-angle) * VERTICAL_RADIUS_IN_M;

                // Create node using locally saved waypoint to avoid contributedNode being reset
                let movetonode = await this.createMoveToNodes('moveL',
                    `EllipsePoint${i}`,
                    savedWaypoint, [offsetX, offsetY, offsetZ]
                );

                // Insert waypoint node directly as child of ellipse-pg
                let addNode:AddNode = {
                    changeSelection: false,
                    insertionRelativeToPivotNode: InsertionEnum.INTO_LAST,
                    node: movetonode,
                    pivotNodeId: pivotNodeId
                };

                treeservice.addNode(addNode);
                console.log('waypoint added!');
            }
    }else{
        if(waypoint === undefined || waypoint === null) {
            console.error('Waypoint is undefined or null! User may have cancelled the move screen.');
        } else {
            console.error('Waypoint received but appears to be default/invalid values (0,0,0). User may have cancelled the move screen.');
            console.error('Received waypoint:', waypoint);
        }
    }
}
    onMoveHereButtonClick() {
        console.log('Move here button clicked!');
        this.presenterAPI.robotMoveService.autoMove(this.contributedNode.parameters.waypoint);
    }

    
    async createMoveToNodes(moveType: string, suggestdName: string, waypoint: Waypoint, 
        delta: [number, number, number]):Promise<MoveToNode> {
        const builder = this.presenterAPI.builder;
        const movetonode = (await builder.createNode(NodeType.MOVE_TO)) as MoveToNode;
        const symbolService = this.presenterAPI.symbolService;

        ////movetonode settings/////////////////////////
        const waypointTabInputModel: WaypointTabInputModel = {
            frame: 'base',
            qNear: waypoint.qNear,
            tcp: waypoint.tcp,
            pose: {
                rx: new TabInputModel<Angle>(
                    {
                        value: waypoint.pose.orientation[0],
                        unit: AngleUnits[0], //radian
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.orientation[0]
                ),
                ry: new TabInputModel<Angle>(
                    {
                        value: waypoint.pose.orientation[1],
                        unit: AngleUnits[0], //radian
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.orientation[1]
                ),
                rz: new TabInputModel<Angle>(
                    {
                        value: waypoint.pose.orientation[2],
                        unit: AngleUnits[0], //radian
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.orientation[2]
                ),
                x: new TabInputModel<Length>(
                    {
                        value: waypoint.pose.position[0] + delta[0],
                        unit: LengthUnits[0], //meter
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.position[0] + delta[0]
                ),
                y: new TabInputModel<Length>(
                    {
                        value: waypoint.pose.position[1] + delta[1],
                        unit: LengthUnits[0], //meter
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.position[1] + delta[1]
                ),
                z: new TabInputModel<Length>(
                    {
                        value: waypoint.pose.position[2] + delta[2],
                        unit: LengthUnits[0], //meter
                    },
                    SelectedInput.VALUE,
                    waypoint.pose.position[2] + delta[2]
                )
            }
        };
        movetonode.parameters.waypoint = waypointTabInputModel;
        movetonode.parameters.moveType = 'moveL';

        const pointName = await symbolService.generateVariable(suggestdName, VariableValueType.WAYPOINT);
        movetonode.parameters.variable = new TabInputModel<URVariable>(
            pointName,
            SelectedInput.VALUE,
            pointName.name
        );

        const blendSettings: MoveToBlendSettings ={
            enabled: true,
            radius: new TabInputModel<Length>(
                {
                    value: SHARED_BLEND_RADIUS_IN_M,
                    unit: LengthUnits[0], //meter
                },
                SelectedInput.VALUE,
                SHARED_BLEND_RADIUS_IN_M,
            ),
        };

        const speedSettings: MoveToSpeedSettings ={
            acceleration: new TabInputModel<Acceleration>(
                {
                    value: SHARED_TOOL_ACCELERATION_IN_M_S2,
                    unit: AccelerationUnits[0], //meter/s2
                },
                SelectedInput.VALUE,
                SHARED_TOOL_ACCELERATION_IN_M_S2
            ),
            speed: new TabInputModel<Speed>(
                {
                    value: SHARED_TOOL_SPEED_IN_M_S,
                    unit: SpeedUnits[0], //meter/s
                },
                SelectedInput.VALUE,
                SHARED_TOOL_SPEED_IN_M_S
            ),
            motionValue: '',
            optiMoveSpeed: new TabInputModel<Value>(
                {
                    value: 0,
                    unit: '', // Provide an empty unit or the appropriate string value as required
                },
                SelectedInput.VALUE,
                0
            ),
            optiMoveAcceleration: new TabInputModel<Value>(
                {
                    value: 0,
                    unit: '', // Provide an empty unit or the appropriate string value as required
                },
                SelectedInput.VALUE,
                0
            )};

        const transformSettings: MoveToTransformSettings = {
            transform: false
        };

        movetonode.parameters.advanced = { 
            speed: speedSettings,
            blend: blendSettings,
            transform: transformSettings
        };

        ////end of movetonode settings/////////////////////////
        return movetonode;
    }

    // call saveNode to save node parameters
    async saveNode() {
        this.cd.detectChanges();
        await this.presenterAPI.programNodeService.updateNode(this.contributedNode);
    }

    // Delete the last child node
    async deleteAllChildNodes() {
        console.log('Remove Child Node button clicked!');
        try {
            let currentNodeId = this.presenterAPI.selectedNodeId;
            console.log(`Initial selected node ID: ${currentNodeId}`);
            
            if (!currentNodeId) {
                console.error('No node ID available. Cannot delete child nodes.');
                return;
            }
            
            // Get current node information and check if it's an ellipse-pg node
            const currentNode = await this.presenterAPI.programTreeService.getProgramNodeById(currentNodeId);
            console.log(`Current node type: ${currentNode.type}`);
            
            // If current node is not ellipse-pg, find its parent node (ellipse-pg node)
            if (currentNode.type !== 'funh-ellipse-polyscopex-ellipse-pg') {
                console.log('Current node is not ellipse-pg, finding parent node...');
                const subtreeContext = await this.presenterAPI.programTreeService.getSubtreeContextFromProgramNodeById(currentNodeId);
                
                // Traverse ancestor nodes to find the ellipse-pg node
                for await (const ancestor of subtreeContext.ancestors) {
                    if (ancestor.node && ancestor.node.type === 'funh-ellipse-polyscopex-ellipse-pg') {
                        currentNodeId = ancestor.id;
                        console.log(`Found ellipse-pg parent node ID: ${currentNodeId}`);
                        break;
                    }
                }
                
                // If still not found, try to find using contributedNode type
                if (currentNode.type !== 'funh-ellipse-polyscopex-ellipse-pg') {
                    // Get all ellipse-pg node instances
                    const instances = await this.presenterAPI.programTreeService.getContributedNodeInstancesForURCap();
                    const ellipsePgInstance = instances.find(inst => inst.node.type === 'funh-ellipse-polyscopex-ellipse-pg');
                    if (ellipsePgInstance) {
                        currentNodeId = ellipsePgInstance.id;
                        console.log(`Found ellipse-pg node from instances: ${currentNodeId}`);
                    }
                }
            }
            
            if (!currentNodeId) {
                console.error('Could not find ellipse-pg node ID. Cannot delete child nodes.');
                return;
            }
            
            console.log(`Using node ID for deletion: ${currentNodeId}`);
            const subtreeContext = await this.presenterAPI.programTreeService.getSubtreeContextFromProgramNodeById(currentNodeId);
            
            // Collect all child node IDs
            const childNodeIds: string[] = [];
            for await (const child of subtreeContext.children) {
                if (child.id) {
                    childNodeIds.push(child.id);
                    console.log(`Found child node: ${child.id}, type: ${child.node?.type}`);
                }
            }
            
            console.log(`Found ${childNodeIds.length} child nodes`);
            
            if (childNodeIds.length === 0) {
                console.log('No child nodes to delete');
                return;
            }
            
            // Delete only the last child node
            const lastChildNodeId = childNodeIds[childNodeIds.length - 1];
            const removeNode: RemoveNode = {
                nodeId: lastChildNodeId,
                changeSelection: false
            };
            console.log(`Attempting to delete last child node: ${lastChildNodeId}`);
            
            try {
                await this.presenterAPI.programTreeService.removeChildNode(removeNode);
                console.log(`Delete API call completed for node: ${lastChildNodeId}`);
                
                // Wait for a period to ensure deletion operation completes
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Verify if deletion was successful
                const verifyContext = await this.presenterAPI.programTreeService.getSubtreeContextFromProgramNodeById(currentNodeId);
                const remainingChildIds: string[] = [];
                for await (const child of verifyContext.children) {
                    if (child.id) {
                        remainingChildIds.push(child.id);
                    }
                }
                
                const wasDeleted = !remainingChildIds.includes(lastChildNodeId);
                if (wasDeleted) {
                    console.log(`Successfully deleted last child node: ${lastChildNodeId}`);
                    console.log(`Remaining child nodes: ${remainingChildIds.length}`);
                } else {
                    console.warn(`Warning: Node ${lastChildNodeId} still exists after deletion attempt`);
                    console.warn(`Remaining child node IDs:`, remainingChildIds);
                }
                
                // Trigger change detection to ensure UI updates
                this.cd.detectChanges();
            } catch (error) {
                console.error(`Failed to delete child node ${lastChildNodeId}:`, error);
                throw error;
            }
        } catch (error) {
            console.error('Error deleting child node:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
        }
    }
}
